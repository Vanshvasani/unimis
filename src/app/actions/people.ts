"use server";
import bcrypt from "bcrypt";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireUser, invalidateUser } from "@/lib/auth";
import { assertCan, assertDepartment, Forbidden } from "@/lib/rbac";
import type { S } from "./admin";

const audit = (actorId: string, action: string, entity: string, entityId: string, detail?: Record<string, string | number | boolean>) =>
  db.auditLog.create({ data: { actorId, action, entity, entityId, detail } });

const userSchema = z.object({
  email: z.string().email("Enter a valid email").transform((s) => s.toLowerCase()),
  name: z.string().min(2).max(80),
  role: z.enum(["ADMIN", "COORDINATOR", "EXAM_OFFICER", "FACULTY", "STUDENT"]),
  departmentId: z.string().optional().transform((v) => v || undefined),
  password: z.string().min(10, "Password must be at least 10 characters").max(100),
}).refine((v) => !["COORDINATOR", "FACULTY"].includes(v.role) || !!v.departmentId,
  { message: "Department is required for coordinators and faculty", path: ["departmentId"] });

export async function createUser(_: S, fd: FormData): Promise<S> {
  const u = await requireUser();
  assertCan(u, "user.manage");
  const p = userSchema.safeParse(Object.fromEntries(fd));
  if (!p.success) return { error: p.error.issues[0].message };
  if (p.data.departmentId && !(await db.department.findUnique({ where: { id: p.data.departmentId } })))
    return { error: "Unknown department." };
  try {
    const { password, ...rest } = p.data;
    const created = await db.user.create({ data: { ...rest, passwordHash: await bcrypt.hash(password, 10) } });
    await audit(u.id, "user.create", "User", created.id, { role: created.role }); // never log the password
  } catch { return { error: "That email is already in use." }; }
  revalidatePath("/people");
  return { ok: true };
}

export async function toggleActive(fd: FormData): Promise<void> {
  const u = await requireUser();
  assertCan(u, "user.manage");
  const id = String(fd.get("id") ?? "");
  if (id === u.id) throw new Forbidden("Not allowed: you cannot deactivate your own account");
  const target = await db.user.findUniqueOrThrow({ where: { id } });
  await db.user.update({ where: { id }, data: { active: !target.active } });
  invalidateUser(id);
  await audit(u.id, target.active ? "user.deactivate" : "user.activate", "User", id);
  revalidatePath("/people");
}

export async function enrollStudent(_: S, fd: FormData): Promise<S> {
  const u = await requireUser();
  assertCan(u, "timetable.manage");
  const p = z.object({ studentId: z.string().min(1), groupId: z.string().min(1) }).safeParse(Object.fromEntries(fd));
  if (!p.success) return { error: "Select a student and a group." };
  const [student, group] = await Promise.all([
    db.user.findUnique({ where: { id: p.data.studentId } }),
    db.studentGroup.findUnique({ where: { id: p.data.groupId } }),
  ]);
  if (!student || !group || student.role !== "STUDENT") return { error: "Unknown student or group." };
  assertDepartment(u, group.departmentId);
  if (student.departmentId !== group.departmentId) return { error: "Student and group must be in the same department." };
  try {
    const e = await db.enrollment.create({ data: p.data });
    await audit(u.id, "enrollment.create", "Enrollment", e.id, { groupId: group.id });
  } catch { return { error: "Student is already in this group." }; }
  revalidatePath("/people");
  return { ok: true };
}

export async function removeEnrollment(fd: FormData): Promise<void> {
  const u = await requireUser();
  assertCan(u, "timetable.manage");
  const e = await db.enrollment.findUniqueOrThrow({ where: { id: String(fd.get("id") ?? "") }, include: { group: true } });
  assertDepartment(u, e.group.departmentId);
  await db.enrollment.delete({ where: { id: e.id } }); // past attendance records are kept
  await audit(u.id, "enrollment.remove", "Enrollment", e.id, { groupId: e.groupId });
  revalidatePath("/people");
}
