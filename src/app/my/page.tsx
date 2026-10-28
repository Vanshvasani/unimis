import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { fmt } from "@/lib/conflicts";

const days = ["", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default async function MyPage() {
  const user = await requireUser();
  if (user.role !== "STUDENT") redirect("/dashboard");
  const mine = { enrollments: { some: { studentId: user.id } } };
  const [entries, exams, records] = await Promise.all([
    db.timetableEntry.findMany({ where: { status: "PUBLISHED", offering: { group: mine } }, include: { room: true, offering: { include: { course: true, faculty: true } } }, orderBy: [{ dayOfWeek: "asc" }, { startMin: "asc" }] }),
    db.examSchedule.findMany({ where: { status: "PUBLISHED", group: mine }, include: { course: true, room: true }, orderBy: { date: "asc" } }),
    db.attendance.findMany({ where: { studentId: user.id, session: { cancelled: false } }, include: { session: { include: { entry: { include: { offering: { include: { course: true } } } } } } }, orderBy: { session: { date: "desc" } } }),
  ]);
  const summary = new Map<string, { code: string; total: number; attended: number }>();
  for (const r of records) {
    const c = r.session.entry.offering.course;
    const row = summary.get(c.id) ?? { code: c.code, total: 0, attended: 0 };
    row.total++; if (r.status === "PRESENT" || r.status === "LATE") row.attended++;
    summary.set(c.id, row);
  }
  return (
    <main className="mx-auto max-w-4xl space-y-6 p-6">
      <h1 className="text-xl font-semibold">My records</h1>
      <section aria-labelledby="c"><h2 id="c" className="mb-2 font-medium">Class timetable</h2>
        {entries.length === 0 ? <p className="text-sm text-gray-600">No published classes yet.</p> :
          <ul className="space-y-1 text-sm">{entries.map((e) => <li key={e.id}>{days[e.dayOfWeek]} {fmt(e.startMin)}–{fmt(e.endMin)}: {e.offering.course.code} with {e.offering.faculty.name}, room {e.room.name}</li>)}</ul>}
      </section>
      <section aria-labelledby="e"><h2 id="e" className="mb-2 font-medium">Exam timetable</h2>
        {exams.length === 0 ? <p className="text-sm text-gray-600">No published exams.</p> :
          <ul className="space-y-1 text-sm">{exams.map((e) => <li key={e.id}>{e.date.toISOString().slice(0, 10)} {fmt(e.startMin)}–{fmt(e.endMin)}: {e.course.code}, room {e.room.name}</li>)}</ul>}
      </section>
      <section aria-labelledby="a"><h2 id="a" className="mb-2 font-medium">Attendance</h2>
        {summary.size === 0 ? <p className="text-sm text-gray-600">No attendance recorded yet.</p> : (
          <table className="w-full text-sm"><thead><tr className="text-left"><th>Course</th><th>Attended</th><th>Sessions</th><th>%</th></tr></thead>
            <tbody>{[...summary.values()].map((r) => <tr key={r.code} className="border-t"><td>{r.code}</td><td>{r.attended}</td><td>{r.total}</td><td>{Math.round((r.attended / r.total) * 100)}%</td></tr>)}</tbody></table>)}
      </section>
    </main>
  );
}
