import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { assertCan } from "@/lib/rbac";
import { fmt } from "@/lib/conflicts";

export default async function AttendanceList({ searchParams }: { searchParams: { q?: string; unmarked?: string } }) {
  const user = await requireUser();
  assertCan(user, "attendance.mark");
  const q = searchParams.q?.trim();
  const course: Prisma.CourseWhereInput = q ? { OR: [{ code: { contains: q, mode: "insensitive" } }, { title: { contains: q, mode: "insensitive" } }] } : {};
  const sessions = await db.classSession.findMany({
    where: { cancelled: false, date: { lte: new Date() }, entry: { status: "PUBLISHED", offering: { facultyId: user.id, course } } },
    include: { _count: { select: { attendance: true } }, entry: { include: { room: true, offering: { include: { course: true, group: { include: { _count: { select: { enrollments: true } } } } } } } } },
    orderBy: { date: "desc" }, take: 60,
  });
  const rows = searchParams.unmarked ? sessions.filter((s) => s._count.attendance === 0) : sessions;
  return (
    <main className="mx-auto max-w-4xl space-y-4 p-6">
      <h1 className="text-xl font-semibold">My class sessions</h1>
      <form role="search" className="flex flex-wrap items-center gap-2 text-sm">
        <label>Course<input name="q" defaultValue={q} className="ml-1 rounded border p-1" /></label>
        <label><input type="checkbox" name="unmarked" value="1" defaultChecked={!!searchParams.unmarked} /> Unmarked only</label>
        <button className="rounded border px-3 py-1">Filter</button>
      </form>
      {rows.length === 0 ? <p className="text-sm text-gray-600">No past sessions yet. Sessions appear once a timetable entry is published and its date arrives.</p> : (
        <div className="overflow-x-auto"><table className="w-full text-sm">
          <thead><tr className="text-left"><th>Date</th><th>Time</th><th>Course</th><th>Group</th><th>Room</th><th>Marked</th><th></th></tr></thead>
          <tbody>{rows.map((s) => (
            <tr key={s.id} className="border-t">
              <td>{s.date.toISOString().slice(0, 10)}</td><td>{fmt(s.entry.startMin)}–{fmt(s.entry.endMin)}</td>
              <td>{s.entry.offering.course.code}</td><td>{s.entry.offering.group.name}</td><td>{s.entry.room.name}</td>
              <td>{s._count.attendance}/{s.entry.offering.group._count.enrollments}</td>
              <td><Link className="text-indigo-700 underline" href={`/attendance/${s.id}`}>{s._count.attendance ? "Review/edit" : "Mark"}</Link></td>
            </tr>))}</tbody>
        </table></div>)}
    </main>
  );
}
