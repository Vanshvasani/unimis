import { redirect } from "next/navigation";
import type { Prisma } from "@prisma/client";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";
import { fmt } from "@/lib/conflicts";
import EntryForm from "./EntryForm";
import ScheduleActions from "@/components/ScheduleActions";

const days = ["", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const statuses = ["DRAFT", "PUBLISHED", "CANCELLED"] as const;

export default async function TimetablePage({ searchParams }: { searchParams: { q?: string; day?: string; status?: string } }) {
  const user = await requireUser();
  if (!can(user.role, "timetable.manage")) redirect("/dashboard");
  const scope: Prisma.CourseOfferingWhereInput = user.role === "COORDINATOR" ? { course: { departmentId: user.departmentId ?? "none" } } : {};
  const q = searchParams.q?.trim();
  const day = Number(searchParams.day);
  const status = statuses.find((s) => s === searchParams.status);
  const search: Prisma.CourseOfferingWhereInput = q ? { OR: [
    { course: { code: { contains: q, mode: "insensitive" } } },
    { course: { title: { contains: q, mode: "insensitive" } } },
    { faculty: { name: { contains: q, mode: "insensitive" } } },
  ] } : {};

  const [offerings, rooms, entries] = await Promise.all([
    db.courseOffering.findMany({ where: scope, include: { course: true, faculty: true, group: true }, orderBy: { course: { code: "asc" } } }),
    db.room.findMany({ orderBy: { name: "asc" } }),
    db.timetableEntry.findMany({
      where: { dayOfWeek: day >= 1 && day <= 7 ? day : undefined, status, offering: { AND: [scope, search] } },
      include: { room: true, offering: { include: { course: true, faculty: true, group: true } } },
      orderBy: [{ dayOfWeek: "asc" }, { startMin: "asc" }],
      take: 300,
    }),
  ]);

  return (
    <main className="mx-auto max-w-4xl space-y-6 p-6">
      <h1 className="text-xl font-semibold">Timetable builder</h1>
      <EntryForm
        offerings={offerings.map((o) => ({ id: o.id, label: `${o.course.code} · ${o.group.name} · ${o.faculty.name}` }))}
        rooms={rooms.map((r) => ({ id: r.id, label: `${r.name} (${r.capacity})` }))}
      />
      <form className="flex flex-wrap items-end gap-2 text-sm" role="search">
        <label>Search<input name="q" defaultValue={q} placeholder="Course or faculty" className="ml-1 rounded border p-1" /></label>
        <label>Day<select name="day" defaultValue={searchParams.day ?? ""} className="ml-1 rounded border p-1"><option value="">All</option>{days.slice(1).map((d, i) => <option key={d} value={i + 1}>{d}</option>)}</select></label>
        <label>Status<select name="status" defaultValue={status ?? ""} className="ml-1 rounded border p-1"><option value="">All</option>{statuses.map((s) => <option key={s}>{s}</option>)}</select></label>
        <button className="rounded border px-3 py-1">Filter</button>
      </form>
      {entries.length === 0 ? <p className="text-sm text-gray-600">No timetable entries match.</p> : (
        <div className="overflow-x-auto"><table className="w-full text-sm">
          <thead><tr className="text-left"><th>Day</th><th>Time</th><th>Course</th><th>Faculty</th><th>Group</th><th>Room</th><th>Status</th><th></th></tr></thead>
          <tbody>{entries.map((e) => (
            <tr key={e.id} className="border-t align-top">
              <td>{days[e.dayOfWeek]}</td><td>{fmt(e.startMin)}–{fmt(e.endMin)}</td><td>{e.offering.course.code}</td>
              <td>{e.offering.faculty.name}</td><td>{e.offering.group.name}</td><td>{e.room.name}</td><td>{e.status}</td>
              <td><ScheduleActions kind="entry" id={e.id} status={e.status} /></td>
            </tr>))}</tbody>
        </table></div>)}
    </main>
  );
}
