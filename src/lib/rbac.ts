import type { Role } from "@prisma/client";

export type Permission =
  | "timetable.manage" | "timetable.publish" | "exam.manage"
  | "attendance.mark" | "attendance.viewOwn" | "schedule.viewOwn" | "report.view"
  | "setup.manage" | "user.manage" | "audit.view";

const matrix: Record<Role, Permission[]> = {
  ADMIN: ["timetable.manage", "timetable.publish", "exam.manage", "report.view", "setup.manage", "user.manage", "audit.view"],
  COORDINATOR: ["timetable.manage", "timetable.publish", "report.view"],
  EXAM_OFFICER: ["exam.manage"],
  FACULTY: ["attendance.mark", "schedule.viewOwn"],
  STUDENT: ["schedule.viewOwn", "attendance.viewOwn"],
};

export const can = (role: Role, p: Permission) => matrix[role].includes(p);

export class Forbidden extends Error {}

export function assertCan(user: { role: Role }, p: Permission) {
  if (!can(user.role, p)) throw new Forbidden(`Not allowed: ${p}`);
}

/** Coordinators are limited to their own department; admins are not. */
export function assertDepartment(user: { role: Role; departmentId: string | null }, departmentId: string) {
  if (user.role === "ADMIN") return;
  if (user.role === "COORDINATOR" && user.departmentId === departmentId) return;
  throw new Forbidden("Outside your department");
}
