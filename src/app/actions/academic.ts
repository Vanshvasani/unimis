"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { assertCan, assertDepartment } from "@/lib/rbac";
import type { S } from "./admin";

export async function createDepartment(_: S, fd: FormData): Promise<S> {
  const u = await requireUser();
  assertCan(u, "setup.manage");
  const p = z.object({ code: z.string().min(2).max(10).transform((s) => s.toUpperCase()), name: z.string().min(2).max(80) })
    .safeParse(Object.fromEntries(fd));
  if (!p.success) return { error: p.error.issues[0].message };
  try {
    const d = await db.department.create({ data: p.data });
    await db.auditLog.create({ data: { actorId: u.id, action: "department.create", entity: "Department", entityId: d.id } });
  } catch { return { error: "Department code already exists." }; }
  revalidatePath("/academic");
  return { ok: true };
}

export async function createTerm(_: S, fd: FormData): Promise<S> {
  const u = await requireUser();
  assertCan(u, "setup.manage");
  const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Enter valid dates");
  const p = z.object({ name: z.string().min(2).max(40), startDate: date, endDate: date }).safeParse(Object.fromEntries(fd));
  if (!p.success) return { error: p.error.issues[0].message };
  const startDate = new Date(`${p.data.startDate}T00:00:00Z`), endDate = new Date(`${p.data.endDate}T00:00:00Z`);
  if (endDate <= startDate) return { error: "End date must be after start date." };
  try {
    const t = await db.term.create({ data: { name: p.data.name, startDate, endDate } });
    await db.auditLog.create({ data: { actorId: u.id, action: "term.create", entity: "Term", entityId: t.id } });
  } catch { return { error: "A term with this name already exists." }; }
  revalidatePath("/academic");
  return { ok: true };
}

export async function createGroup(_: S, fd: FormData): Promise<S> {
  const u = await requireUser();
  assertCan(u, "timetable.manage");
  const p = z.object({ name: z.string().min(2).max(40), departmentId: z.string().min(1) }).safeParse(Object.fromEntries(fd));
  if (!p.success) return { error: "Enter a group name and department." };
  assertDepartment(u, p.data.departmentId);
  try {
    const g = await db.studentGroup.create({ data: p.data });
    await db.auditLog.create({ data: { actorId: u.id, action: "group.create", entity: "StudentGroup", entityId: g.id } });
  } catch { return { error: "This group already exists in the department." }; }
  revalidatePath("/academic");
  return { ok: true };
}
