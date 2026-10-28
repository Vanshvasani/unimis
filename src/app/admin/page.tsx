import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";
import { RoomForm, CourseForm, OfferingForm } from "./AdminForms";

export default async function AdminPage() {
  const user = await requireUser();
  if (!can(user.role, "timetable.manage")) redirect("/dashboard");
  const isAdmin = can(user.role, "setup.manage");
  const dept = user.role === "COORDINATOR" ? { departmentId: user.departmentId ?? "none" } : {};
  const [campus, departments, terms, courses, faculty, groups, offerings] = await Promise.all([
    db.campus.findFirst(),
    db.department.findMany({ orderBy: { code: "asc" } }),
    db.term.findMany({ orderBy: { startDate: "desc" } }),
    db.course.findMany({ where: dept, orderBy: { code: "asc" } }),
    db.user.findMany({ where: { role: "FACULTY", active: true, ...dept }, orderBy: { name: "asc" } }),
    db.studentGroup.findMany({ where: dept, orderBy: { name: "asc" } }),
    db.courseOffering.findMany({ where: { course: dept }, include: { course: true, faculty: true, group: true, term: true }, orderBy: { course: { code: "asc" } } }),
  ]);
  return (
    <main className="mx-auto max-w-4xl space-y-8 p-6">
      <h1 className="text-xl font-semibold">Course offerings</h1>
      {isAdmin && campus && (
        <div className="grid gap-6 md:grid-cols-2">
          <RoomForm campusId={campus.id} />
          <CourseForm departments={departments} />
        </div>
      )}
      <OfferingForm courses={courses} terms={terms} faculty={faculty} groups={groups} />
      <section aria-labelledby="off">
        <h2 id="off" className="mb-2 font-medium">Course offerings</h2>
        {offerings.length === 0 ? <p className="text-sm text-gray-600">No offerings yet.</p> : (
          <div className="overflow-x-auto"><table className="w-full text-sm">
            <thead><tr className="text-left"><th>Course</th><th>Term</th><th>Faculty</th><th>Group</th></tr></thead>
            <tbody>{offerings.map((o) => <tr key={o.id} className="border-t"><td>{o.course.code}</td><td>{o.term.name}</td><td>{o.faculty.name}</td><td>{o.group.name}</td></tr>)}</tbody>
          </table></div>)}
      </section>
    </main>
  );
}
