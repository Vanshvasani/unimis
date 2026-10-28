import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";
import { DeptForm, TermForm, GroupForm } from "./AcademicForms";

export default async function AcademicPage() {
  const user = await requireUser();
  if (!can(user.role, "timetable.manage")) redirect("/dashboard");
  const isAdmin = can(user.role, "setup.manage");
  const dept = user.role === "COORDINATOR" ? { id: user.departmentId ?? "none" } : {};
  const [departments, terms, groups] = await Promise.all([
    db.department.findMany({ where: dept, orderBy: { code: "asc" } }),
    db.term.findMany({ orderBy: { startDate: "desc" } }),
    db.studentGroup.findMany({ where: user.role === "COORDINATOR" ? { departmentId: user.departmentId ?? "none" } : {}, include: { department: true, _count: { select: { enrollments: true } } }, orderBy: { name: "asc" } }),
  ]);
  return (
    <main className="mx-auto max-w-4xl space-y-8 p-6">
      <h1 className="text-xl font-semibold">Academic structure</h1>
      <div className="grid gap-4 md:grid-cols-3">
        {isAdmin && <DeptForm />}
        {isAdmin && <TermForm />}
        <GroupForm departments={departments} />
      </div>
      <section aria-labelledby="t"><h2 id="t" className="mb-2 font-medium">Terms</h2>
        {terms.length === 0 ? <p className="text-sm text-gray-600">No terms yet.</p> :
          <ul className="space-y-1 text-sm">{terms.map((t) => <li key={t.id}>{t.name}: {t.startDate.toISOString().slice(0, 10)} to {t.endDate.toISOString().slice(0, 10)}</li>)}</ul>}
      </section>
      <section aria-labelledby="g"><h2 id="g" className="mb-2 font-medium">Student groups</h2>
        {groups.length === 0 ? <p className="text-sm text-gray-600">No groups yet.</p> :
          <ul className="space-y-1 text-sm">{groups.map((g) => <li key={g.id}>{g.name} ({g.department.code}): {g._count.enrollments} students</li>)}</ul>}
      </section>
    </main>
  );
}
