"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { assertCan, assertDepartment } from "@/lib/rbac";

export type S = { ok?: boolean; error?: string } | undefined;
const log = (actorId: string, action: string, entity: string, entityId: string) =>
  db.auditLog.create({ data: { actorId, action, entity, entityId } });

export async function createRoom(_: S, fd: FormData): Promise<S> {
  const u = await requireUser();
  assertCan(u, "setup.manage");
  const p = z.object({ name: z.string().min(1).max(40), capacity: z.coerce.number().int().min(1).max(2000), campusId: z.string().min(1) })
    .safeParse(Object.fromEntries(fd));
  if (!p.success) return { error: p.error.issues[0].message };
  try {
    const r = await db.room.create({ data: p.data });
    await log(u.id, "room.create", "Room", r.id);
  } catch { return { error: "A room with this name already exists on the campus." }; }
  revalidatePath("/admin");
  return { ok: true };
}

export async function createCourse(_: S, fd: FormData): Promise<S> {
  const u = await requireUser();
  assertCan(u, "setup.manage");
  const p = z.object({ code: z.string().min(2).max(12).transform((s) => s.toUpperCase()), title: z.string().min(2).max(100),
    credits: z.coerce.number().int().min(1).max(12), departmentId: z.string().min(1) }).safeParse(Object.fromEntries(fd));
  if (!p.success) return { error: p.error.issues[0].message };
  try {
    const c = await db.course.create({ data: p.data });
    await log(u.id, "course.create", "Course", c.id);
  } catch { return { error: "Course code already exists." }; }
  revalidatePath("/admin");
  return { ok: true };
}

export async function createOffering(_: S, fd: FormData): Promise<S> {
  const u = await requireUser();
  assertCan(u, "timetable.manage");
  const p = z.object({ courseId: z.string().min(1), termId: z.string().min(1), facultyId: z.string().min(1), groupId: z.string().min(1) })
    .safeParse(Object.fromEntries(fd));
  if (!p.success) return { error: "Select a course, term, faculty member and group." };
  const [course, faculty, group] = await Promise.all([
    db.course.findUnique({ where: { id: p.data.courseId } }),
    db.user.findUnique({ where: { id: p.data.facultyId } }),
    db.studentGroup.findUnique({ where: { id: p.data.groupId } }),
  ]);
  if (!course || !faculty || !group) return { error: "Unknown course, faculty or group." };
  assertDepartment(u, course.departmentId);
  if (faculty.role !== "FACULTY") return { error: "Selected user is not faculty." };
  if (faculty.departmentId !== course.departmentId || group.departmentId !== course.departmentId)
    return { error: "Faculty and group must belong to the course's department." };
  try {
    const o = await db.courseOffering.create({ data: p.data });
    await log(u.id, "offering.create", "CourseOffering", o.id);
  } catch { return { error: "This offering already exists." }; }
  revalidatePath("/admin");
  return { ok: true };
}
