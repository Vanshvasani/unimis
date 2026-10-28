import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { assertCan } from "@/lib/rbac";

const THRESHOLD = 0.75;
const attended = (s: string) => s === "PRESENT" || s === "LATE"; // same rule as the student view

export default async function Reports() {
  const user = await requireUser();
  assertCan(user, "report.view");
  const scope = user.role === "COORDINATOR" ? { departmentId: user.departmentId ?? "none" } : {};

  const [records, entries, exams] = await Promise.all([
    db.attendance.findMany({
      where: { session: { cancelled: false, entry: { offering: { course: scope } } } },
      include: { student: true, session: { include: { entry: { include: { offering: { include: { course: true } } } } } } },
    }),
    db.timetableEntry.groupBy({ by: ["status"], where: { offering: { course: scope } }, _count: true }),
    db.examSchedule.groupBy({ by: ["status"], where: { course: scope }, _count: true }),
  ]);

  const byCourse = new Map<string, { code: string; title: string; total: number; ok: number }>();
  const byStudent = new Map<string, { name: string; code: string; total: number; ok: number }>();
  for (const r of records) {
    const c = r.session.entry.offering.course;
    const a = byCourse.get(c.id) ?? { code: c.code, title: c.title, total: 0, ok: 0 };
    a.total++; if (attended(r.status)) a.ok++; byCourse.set(c.id, a);
    const k = `${r.studentId}:${c.id}`;
    const b = byStudent.get(k) ?? { name: r.student.name, code: c.code, total: 0, ok: 0 };
    b.total++; if (attended(r.status)) b.ok++; byStudent.set(k, b);
  }
  const low = [...byStudent.values()].filter((s) => s.total >= 3 && s.ok / s.total < THRESHOLD).sort((a, b) => a.ok / a.total - b.ok / b.total);
  const pct = (a: number, b: number) => `${Math.round((a / b) * 100)}%`;
  const counts = (rows: { status: string; _count: number }[]) => rows.map((r) => `${r.status}: ${r._count}`).join(" · ") || "none";

  return (
    <main className="mx-auto max-w-4xl space-y-6 p-6">
      <h1 className="text-xl font-semibold">Reports {user.role === "COORDINATOR" && "(my department)"}</h1>
      <section className="grid gap-3 text-sm md:grid-cols-2">
        <div className="rounded border bg-white p-3"><h2 className="font-medium">Class slots</h2><p>{counts(entries)}</p></div>
        <div className="rounded border bg-white p-3"><h2 className="font-medium">Exams</h2><p>{counts(exams)}</p></div>
      </section>
      <section aria-labelledby="c"><h2 id="c" className="mb-2 font-medium">Attendance by course</h2>
        {byCourse.size === 0 ? <p className="text-sm text-gray-600">No attendance recorded yet.</p> : (
          <table className="w-full text-sm"><thead><tr className="text-left"><th>Course</th><th>Records</th><th>Attendance rate</th></tr></thead>
            <tbody>{[...byCourse.values()].map((r) => <tr key={r.code} className="border-t"><td>{r.code} {r.title}</td><td>{r.total}</td><td>{pct(r.ok, r.total)}</td></tr>)}</tbody></table>)}
      </section>
      <section aria-labelledby="l"><h2 id="l" className="mb-2 font-medium">Students below {THRESHOLD * 100}% (at least 3 sessions recorded)</h2>
        {low.length === 0 ? <p className="text-sm text-gray-600">No students below the threshold.</p> : (
          <table className="w-full text-sm"><thead><tr className="text-left"><th>Student</th><th>Course</th><th>Attended</th><th>%</th></tr></thead>
            <tbody>{low.map((s, i) => <tr key={i} className="border-t"><td>{s.name}</td><td>{s.code}</td><td>{s.ok}/{s.total}</td><td>{pct(s.ok, s.total)}</td></tr>)}</tbody></table>)}
      </section>
    </main>
  );
}
