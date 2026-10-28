import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { fmt } from "@/lib/conflicts";

const days = ["", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default async function Dashboard() {
  const user = await requireUser();

  // Server-side scoping: each role only queries what it may see.
  const where =
    user.role === "FACULTY" ? { offering: { facultyId: user.id } }
    : user.role === "STUDENT" ? { offering: { group: { enrollments: { some: { studentId: user.id } } } } }
    : user.role === "COORDINATOR" ? { offering: { course: { departmentId: user.departmentId ?? "none" } } }
    : {};
  const statusFilter = user.role === "STUDENT" ? { status: "PUBLISHED" as const } : {};

  const entries = await db.timetableEntry.findMany({
    where: { ...where, ...statusFilter },
    include: { room: true, offering: { include: { course: true, faculty: true, group: true } } },
    orderBy: [{ dayOfWeek: "asc" }, { startMin: "asc" }],
    take: 200,
  });
  const groupIds = user.role === "STUDENT"
    ? (await db.enrollment.findMany({ where: { studentId: user.id }, select: { groupId: true } })).map((e) => e.groupId)
    : [];
  const announcements = await db.announcement.findMany({
    where: user.role === "STUDENT" ? { OR: [{ audienceGroupId: null }, { audienceGroupId: { in: groupIds } }] } : {},
    orderBy: { createdAt: "desc" }, take: 5,
  });

  return (
    <main className="mx-auto max-w-4xl space-y-6 p-6">
      <header>
        <h1 className="text-2xl">Welcome, {user.name}</h1>
        <p className="text-sm text-gray-600">Role: {user.role}</p>
      </header>

      <section aria-labelledby="tt">
        <h2 id="tt" className="mb-2 text-lg">Timetable</h2>
        {entries.length === 0 ? <p className="text-sm text-gray-600">No scheduled classes yet.</p> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-left"><th>Day</th><th>Time</th><th>Course</th><th>Group</th><th>Room</th><th>Status</th></tr></thead>
              <tbody>{entries.map((e) => (
                <tr key={e.id} className="border-t">
                  <td>{days[e.dayOfWeek]}</td><td>{fmt(e.startMin)}–{fmt(e.endMin)}</td>
                  <td>{e.offering.course.code}</td><td>{e.offering.group.name}</td><td>{e.room.name}</td><td>{e.status}</td>
                </tr>))}</tbody>
            </table>
          </div>)}
      </section>

      <section aria-labelledby="an">
        <h2 id="an" className="mb-2 text-lg">Announcements</h2>
        {announcements.length === 0 ? <p className="text-sm text-gray-600">Nothing new.</p> :
          <ul className="space-y-1 text-sm">{announcements.map((a) => <li key={a.id}><b>{a.title}</b>: {a.body}</li>)}</ul>}
      </section>
    </main>
  );
}
