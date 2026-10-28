"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { assertCan } from "@/lib/rbac";
import { fmt, type Conflict } from "@/lib/conflicts";
import type { Result } from "./timetable";

const schema = z.object({
  courseId: z.string().min(1), groupId: z.string().min(1), roomId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date"),
  startMin: z.number().int().min(0).max(1439), endMin: z.number().int().min(1).max(1440),
}).refine((v) => v.endMin > v.startMin, { message: "End must be after start" });

async function examConflicts(i: { groupId: string; roomId: string; date: Date; startMin: number; endMin: number; excludeId?: string }) {
  const rows = await db.examSchedule.findMany({
    where: {
      id: i.excludeId ? { not: i.excludeId } : undefined,
      status: { not: "CANCELLED" }, date: i.date,
      startMin: { lt: i.endMin }, endMin: { gt: i.startMin },
      OR: [{ roomId: i.roomId }, { groupId: i.groupId }],
    },
    include: { course: true, room: true, group: true },
  });
  const out: Conflict[] = [];
  for (const e of rows) {
    const when = `${e.course.code} ${fmt(e.startMin)}-${fmt(e.endMin)}`;
    if (e.roomId === i.roomId) out.push({ type: "ROOM", entryId: e.id, message: `Room ${e.room.name} already hosts ${when}` });
    if (e.groupId === i.groupId) out.push({ type: "GROUP", entryId: e.id, message: `Group ${e.group.name} already has ${when}` });
  }
  return out;
}

export async function createExam(raw: unknown): Promise<Result> {
  const user = await requireUser();
  assertCan(user, "exam.manage");
  const p = schema.safeParse(raw);
  if (!p.success) return { ok: false, error: p.error.issues[0].message };
  const date = new Date(`${p.data.date}T00:00:00Z`);
  const conflicts = await examConflicts({ ...p.data, date });
  if (conflicts.length) return { ok: false, error: "Exam conflicts found", conflicts };
  const exam = await db.examSchedule.create({ data: { ...p.data, date, status: "DRAFT" } });
  await db.auditLog.create({ data: { action: "exam.create", entity: "ExamSchedule", entityId: exam.id, actorId: user.id, detail: p.data } });
  revalidatePath("/exams");
  return { ok: true, id: exam.id };
}

export async function updateExam(id: string, raw: unknown): Promise<Result> {
  const user = await requireUser();
  assertCan(user, "exam.manage");
  const p = schema.safeParse(raw);
  if (!p.success) return { ok: false, error: p.error.issues[0].message };
  const exam = await db.examSchedule.findUniqueOrThrow({ where: { id } });
  if (exam.status === "CANCELLED") return { ok: false, error: "Cancelled exams cannot be edited" };

  const date = new Date(`${p.data.date}T00:00:00Z`);
  const conflicts = await examConflicts({ ...p.data, date, excludeId: id });
  if (conflicts.length) return { ok: false, error: "Exam conflicts found", conflicts };

  const course = await db.course.findUniqueOrThrow({ where: { id: p.data.courseId } });
  const ops: Prisma.PrismaPromise<unknown>[] = [
    db.examSchedule.update({ where: { id }, data: { ...p.data, date } }),
    db.auditLog.create({ data: { action: "exam.update", entity: "ExamSchedule", entityId: id, actorId: user.id,
      detail: { before: { courseId: exam.courseId, groupId: exam.groupId, roomId: exam.roomId, date: exam.date.toISOString().slice(0, 10), startMin: exam.startMin, endMin: exam.endMin }, after: p.data } } }),
  ];
  if (exam.status === "PUBLISHED")
    ops.push(db.announcement.create({ data: {
      title: `Exam updated: ${course.code}`,
      body: `${course.title} exam is now on ${p.data.date}, ${fmt(p.data.startMin)}-${fmt(p.data.endMin)}.`,
      audienceGroupId: p.data.groupId,
    } }));
  await db.$transaction(ops);
  revalidatePath("/exams");
  return { ok: true, id };
}

export async function publishExam(id: string): Promise<Result> {
  const user = await requireUser();
  assertCan(user, "exam.manage");
  const exam = await db.examSchedule.findUniqueOrThrow({ where: { id }, include: { course: true } });
  if (exam.status === "CANCELLED") return { ok: false, error: "Cancelled exams cannot be published" };
  const conflicts = await examConflicts({ ...exam, excludeId: id });
  if (conflicts.length) return { ok: false, error: "Cannot publish: conflicts found", conflicts };
  await db.$transaction([
    db.examSchedule.update({ where: { id }, data: { status: "PUBLISHED" } }),
    db.announcement.create({ data: {
      title: `Exam published: ${exam.course.code}`,
      body: `${exam.course.title} exam on ${exam.date.toISOString().slice(0, 10)}, ${fmt(exam.startMin)}-${fmt(exam.endMin)}.`,
      audienceGroupId: exam.groupId,
    } }),
    db.auditLog.create({ data: { action: "exam.publish", entity: "ExamSchedule", entityId: id, actorId: user.id } }),
  ]);
  revalidatePath("/exams");
  return { ok: true, id };
}

export async function cancelExam(id: string): Promise<Result> {
  const user = await requireUser();
  assertCan(user, "exam.manage");
  const exam = await db.examSchedule.findUniqueOrThrow({ where: { id }, include: { course: true } });
  await db.$transaction([
    db.examSchedule.update({ where: { id }, data: { status: "CANCELLED" } }),
    db.announcement.create({ data: { title: `Exam cancelled: ${exam.course.code}`, body: `The ${exam.course.title} exam was cancelled.`, audienceGroupId: exam.groupId } }),
    db.auditLog.create({ data: { action: "exam.cancel", entity: "ExamSchedule", entityId: id, actorId: user.id } }),
  ]);
  revalidatePath("/exams");
  return { ok: true, id };
}
