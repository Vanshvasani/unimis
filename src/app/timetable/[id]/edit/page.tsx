import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { assertCan, assertDepartment } from "@/lib/rbac";
import { fmt } from "@/lib/conflicts";
import EditEntryForm from "./EditEntryForm";

export default async function EditEntry({ params }: { params: { id: string } }) {
  const user = await requireUser();
  assertCan(user, "timetable.manage");
  const e = await db.timetableEntry.findUnique({ where: { id: params.id }, include: { offering: { include: { course: true } } } });
  if (!e) notFound();
  assertDepartment(user, e.offering.course.departmentId);
  const scope = user.role === "COORDINATOR" ? { course: { departmentId: user.departmentId ?? "none" } } : {};
  const [offerings, rooms] = await Promise.all([
    db.courseOffering.findMany({ where: scope, include: { course: true, faculty: true, group: true }, orderBy: { course: { code: "asc" } } }),
    db.room.findMany({ orderBy: { name: "asc" } }),
  ]);
  if (e.status === "CANCELLED") return <main className="p-6 text-sm">Cancelled entries cannot be edited.</main>;
  return (
    <main className="mx-auto max-w-3xl space-y-4 p-6">
      <h1 className="text-xl font-semibold">Edit class slot ({e.status})</h1>
      <EditEntryForm id={e.id} locked={e.status === "PUBLISHED"}
        offerings={offerings.map((o) => ({ id: o.id, label: `${o.course.code} · ${o.group.name} · ${o.faculty.name}` }))}
        rooms={rooms.map((r) => ({ id: r.id, label: `${r.name} (${r.capacity})` }))}
        d={{ offeringId: e.offeringId, roomId: e.roomId, day: e.dayOfWeek, start: fmt(e.startMin), end: fmt(e.endMin) }} />
    </main>
  );
}
