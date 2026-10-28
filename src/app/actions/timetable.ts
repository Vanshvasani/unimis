"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { assertCan, assertDepartment } from "@/lib/rbac";
import { findConflicts, type Conflict } from "@/lib/conflicts";

const entrySchema = z.object({
  offeringId: z.string().min(1), roomId: z.string().min(1),
  dayOfWeek: z.number().int().min(1).max(7),
  startMin: z.number().int().min(0).max(1439), endMin: z.number().int().min(1).max(1440),
}).refine((v) => v.endMin > v.startMin, { message: "End must be after start" });

export type Result = { ok: true; id?: string } | { ok: false; error: string; conflicts?: Conflict[] };

async function loadOffering(id: string) {
  return db.courseOffering.findUniqueOrThrow({ where: { id }, include: { course: true, term: true, group: true } });
}

export async function createEntry(raw: unknown): Promise<Result> {
  const user = await requireUser();
  assertCan(user, "timetable.manage");
  const parsed = entrySchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const offering = await loadOffering(parsed.data.offeringId);
  assertDepartment(user, offering.course.departmentId);

  const conflicts = await findConflicts(parsed.data);
  if (conflicts.length) return { ok: false, error: "Timetable conflicts found", conflicts };

  const entry = await db.timetableEntry.create({ data: { ...parsed.data, status: "DRAFT" } });
  await db.auditLog.create({ data: { action: "timetable.create", entity: "TimetableEntry", entityId: entry.id, actorId: user.id, detail: parsed.data } });
  revalidatePath("/dashboard");
  return { ok: true, id: entry.id };
}

export async function updateEntry(id: string, raw: unknown): Promise<Result> {
  const user = await requireUser();
  assertCan(user, "timetable.manage");
  const parsed = entrySchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const entry = await db.timetableEntry.findUniqueOrThrow({ where: { id } });
  if (entry.status === "CANCELLED") return { ok: false, error: "Cancelled entries cannot be edited" };
  const current = await loadOffering(entry.offeringId);
  assertDepartment(user, current.course.departmentId);

  if (entry.status === "PUBLISHED" && (parsed.data.offeringId !== entry.offeringId || parsed.data.dayOfWeek !== entry.dayOfWeek))
    return { ok: false, error: "Published entries: only room and time can change. Cancel and recreate to change the course or day." };

  const next = await loadOffering(parsed.data.offeringId);
  assertDepartment(user, next.course.departmentId);

  const conflicts = await findConflicts({ ...parsed.data, excludeId: id });
  if (conflicts.length) return { ok: false, error: "Timetable conflicts found", conflicts };

  const ops: Prisma.PrismaPromise<unknown>[] = [
    db.timetableEntry.update({ where: { id }, data: parsed.data }),
    db.auditLog.create({ data: { action: "timetable.update", entity: "TimetableEntry", entityId: id, actorId: user.id,
      detail: { before: { offeringId: entry.offeringId, roomId: entry.roomId, dayOfWeek: entry.dayOfWeek, startMin: entry.startMin, endMin: entry.endMin }, after: parsed.data } } }),
  ];
  if (entry.status === "PUBLISHED")
    ops.push(db.announcement.create({ data: {
      title: `Timetable updated: ${next.course.code}`,
      body: `${next.course.title} for ${next.group.name} was rescheduled. Check your timetable.`,
      audienceGroupId: next.groupId,
    } }));
  await db.$transaction(ops);
  revalidatePath("/dashboard"); revalidatePath("/timetable");
  return { ok: true, id };
}

export async function publishEntry(entryId: string): Promise<Result> {
  const user = await requireUser();
  assertCan(user, "timetable.publish");
  const entry = await db.timetableEntry.findUniqueOrThrow({ where: { id: entryId } });
  const offering = await loadOffering(entry.offeringId);
  assertDepartment(user, offering.course.departmentId);
  if (entry.status === "CANCELLED") return { ok: false, error: "Cancelled entries cannot be published" };

  const conflicts = await findConflicts({ ...entry, excludeId: entry.id });
  if (conflicts.length) return { ok: false, error: "Cannot publish: conflicts found", conflicts };

  // Generate one session per matching weekday within the term.
  const dates: Date[] = [];
  const cur = new Date(offering.term.startDate);
  while (cur <= offering.term.endDate) {
    const dow = cur.getUTCDay() === 0 ? 7 : cur.getUTCDay();
    if (dow === entry.dayOfWeek) dates.push(new Date(cur));
    cur.setUTCDate(cur.getUTCDate() + 1);
  }

  await db.$transaction([
    db.timetableEntry.update({ where: { id: entry.id }, data: { status: "PUBLISHED" } }),
    db.classSession.createMany({ data: dates.map((date) => ({ entryId: entry.id, date })), skipDuplicates: true }),
    db.announcement.create({ data: {
      title: `Timetable published: ${offering.course.code}`,
      body: `${offering.course.title} for ${offering.group.name} is now scheduled.`,
      audienceGroupId: offering.groupId,
    } }),
    db.auditLog.create({ data: { action: "timetable.publish", entity: "TimetableEntry", entityId: entry.id, actorId: user.id, detail: { sessions: dates.length } } }),
  ]);
  revalidatePath("/dashboard");
  return { ok: true, id: entry.id };
}

export async function cancelEntry(entryId: string): Promise<Result> {
  const user = await requireUser();
  assertCan(user, "timetable.manage");
  const entry = await db.timetableEntry.findUniqueOrThrow({ where: { id: entryId } });
  const offering = await loadOffering(entry.offeringId);
  assertDepartment(user, offering.course.departmentId);

  await db.$transaction([
    db.timetableEntry.update({ where: { id: entryId }, data: { status: "CANCELLED" } }),
    db.classSession.updateMany({ where: { entryId, date: { gte: new Date() } }, data: { cancelled: true } }),
    db.announcement.create({ data: {
      title: `Class cancelled: ${offering.course.code}`,
      body: `Future sessions of ${offering.course.title} were cancelled.`,
      audienceGroupId: offering.groupId,
    } }),
    db.auditLog.create({ data: { action: "timetable.cancel", entity: "TimetableEntry", entityId: entryId, actorId: user.id } }),
  ]);
  revalidatePath("/dashboard");
  return { ok: true, id: entryId };
}
