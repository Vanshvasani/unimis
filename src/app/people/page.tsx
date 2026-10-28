import { redirect } from "next/navigation";
import type { Prisma } from "@prisma/client";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";
import { toggleActive, removeEnrollment } from "../actions/people";
import { UserForm, EnrollForm } from "./PeopleForms";

const ROLES = ["ADMIN", "COORDINATOR", "EXAM_OFFICER", "FACULTY", "STUDENT"] as const;

export default async function PeoplePage({ searchParams }: { searchParams: { q?: string; role?: string } }) {
  const user = await requireUser();
  if (!can(user.role, "timetable.manage")) redirect("/dashboard");
  const isAdmin = can(user.role, "user.manage");
  const dept = user.role === "COORDINATOR" ? { departmentId: user.departmentId ?? "none" } : {};
  const q = searchParams.q?.trim();
  const role = ROLES.find((r) => r === searchParams.role);
  const search: Prisma.UserWhereInput = q ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { email: { contains: q, mode: "insensitive" } }] } : {};

  const [departments, users, students, groups, enrollments] = await Promise.all([
    isAdmin ? db.department.findMany({ orderBy: { code: "asc" } }) : [],
    isAdmin ? db.user.findMany({ where: { role, ...search }, include: { department: true }, orderBy: { name: "asc" }, take: 100 }) : [],
    db.user.findMany({ where: { role: "STUDENT", active: true, ...dept }, orderBy: { name: "asc" }, take: 500 }),
    db.studentGroup.findMany({ where: dept, orderBy: { name: "asc" } }),
    db.enrollment.findMany({ where: { group: dept }, include: { student: true, group: true }, orderBy: [{ group: { name: "asc" } }, { student: { name: "asc" } }], take: 300 }),
  ]);

  return (
    <main className="mx-auto max-w-4xl space-y-8 p-6">
      <h1 className="text-xl font-semibold">People</h1>
      {isAdmin && <UserForm departments={departments} />}
      <EnrollForm students={students} groups={groups} />

      {isAdmin && (
        <section aria-labelledby="u">
          <h2 id="u" className="mb-2 font-medium">Accounts</h2>
          <form role="search" className="mb-2 flex flex-wrap items-end gap-2 text-sm">
            <label>Search<input name="q" defaultValue={q} placeholder="Name or email" className="ml-1 rounded border p-1" /></label>
            <label>Role<select name="role" defaultValue={role ?? ""} className="ml-1 rounded border p-1"><option value="">All</option>{ROLES.map((r) => <option key={r}>{r}</option>)}</select></label>
            <button className="rounded border px-3 py-1">Filter</button>
          </form>
          {users.length === 0 ? <p className="text-sm text-gray-600">No accounts match.</p> : (
            <div className="overflow-x-auto"><table className="w-full text-sm">
              <thead><tr className="text-left"><th>Name</th><th>Email</th><th>Role</th><th>Dept</th><th>Status</th><th></th></tr></thead>
              <tbody>{users.map((x) => (
                <tr key={x.id} className="border-t">
                  <td>{x.name}</td><td>{x.email}</td><td>{x.role}</td><td>{x.department?.code ?? "–"}</td><td>{x.active ? "Active" : "Inactive"}</td>
                  <td>{x.id !== user.id && <form action={toggleActive}><input type="hidden" name="id" value={x.id} /><button className="rounded border px-2 py-1 text-xs">{x.active ? "Deactivate" : "Activate"}</button></form>}</td>
                </tr>))}</tbody>
            </table></div>)}
        </section>
      )}

      <section aria-labelledby="e">
        <h2 id="e" className="mb-2 font-medium">Group enrollments</h2>
        {enrollments.length === 0 ? <p className="text-sm text-gray-600">No enrollments yet.</p> : (
          <div className="overflow-x-auto"><table className="w-full text-sm">
            <thead><tr className="text-left"><th>Group</th><th>Student</th><th></th></tr></thead>
            <tbody>{enrollments.map((e) => (
              <tr key={e.id} className="border-t"><td>{e.group.name}</td><td>{e.student.name}</td>
                <td><form action={removeEnrollment}><input type="hidden" name="id" value={e.id} /><button className="rounded border px-2 py-1 text-xs">Remove</button></form></td></tr>))}</tbody>
          </table></div>)}
      </section>
    </main>
  );
}
