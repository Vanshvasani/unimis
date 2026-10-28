import type { Prisma } from "@prisma/client";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";
import { fmt } from "@/lib/conflicts";
import ExamForm from "./ExamForm";
import ScheduleActions from "@/components/ScheduleActions";

export default async function ExamsPage({ searchParams }: { searchParams: { q?: string } }) {
  const user = await requireUser();
  const manage = can(user.role, "exam.manage");
  const q = searchParams.q?.trim();

  // Server-side scoping for non-managers: published exams relevant to them only.
  const scope: Prisma.ExamScheduleWhereInput =
    manage ? {}
    : user.role === "FACULTY" ? { status: "PUBLISHED", course: { offerings: { some: { facultyId: user.id } } } }
    : user.role === "STUDENT" ? { status: "PUBLISHED", group: { enrollments: { some: { studentId: user.id } } } }
    : { status: "PUBLISHED", course: { departmentId: user.departmentId ?? "none" } };
  const search: Prisma.ExamScheduleWhereInput = q ? { OR: [
    { course: { code: { contains: q, mode: "insensitive" } } },
    { course: { title: { contains: q, mode: "insensitive" } } },
  ] } : {};

  const exams = await db.examSchedule.findMany({
    where: { AND: [scope, search] },
    include: { course: true, room: true, group: true },
    orderBy: [{ date: "asc" }, { startMin: "asc" }],
    take: 300,
  });
  const [courses, groups, rooms] = manage
    ? await Promise.all([db.course.findMany({ orderBy: { code: "asc" } }), db.studentGroup.findMany({ orderBy: { name: "asc" } }), db.room.findMany({ orderBy: { name: "asc" } })])
    : [[], [], []];

  return (
    <main className="mx-auto max-w-4xl space-y-6 p-6">
      <h1 className="text-xl font-semibold">Exam schedules</h1>
      {manage && <ExamForm courses={courses.map((c) => ({ id: c.id, label: `${c.code} ${c.title}` }))} groups={groups.map((g) => ({ id: g.id, label: g.name }))} rooms={rooms.map((r) => ({ id: r.id, label: r.name }))} />}
      <form role="search" className="text-sm"><label>Search<input name="q" defaultValue={q} placeholder="Course" className="ml-1 rounded border p-1" /></label> <button className="ml-1 rounded border px-3 py-1">Filter</button></form>
      {exams.length === 0 ? <p className="text-sm text-gray-600">No exams to show.</p> : (
        <div className="overflow-x-auto"><table className="w-full text-sm">
          <thead><tr className="text-left"><th>Date</th><th>Time</th><th>Course</th><th>Group</th><th>Room</th>{manage && <><th>Status</th><th></th></>}</tr></thead>
          <tbody>{exams.map((e) => (
            <tr key={e.id} className="border-t align-top">
              <td>{e.date.toISOString().slice(0, 10)}</td><td>{fmt(e.startMin)}–{fmt(e.endMin)}</td><td>{e.course.code}</td><td>{e.group.name}</td><td>{e.room.name}</td>
              {manage && <><td>{e.status}</td><td><ScheduleActions kind="exam" id={e.id} status={e.status} /></td></>}
            </tr>))}</tbody>
        </table></div>)}
    </main>
  );
}
