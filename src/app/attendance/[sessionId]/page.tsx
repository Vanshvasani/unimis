import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { assertCan } from "@/lib/rbac";
import AttendanceForm from "./AttendanceForm";

export default async function SessionPage({ params }: { params: { sessionId: string } }) {
  const user = await requireUser();
  assertCan(user, "attendance.mark");
  const s = await db.classSession.findUnique({
    where: { id: params.sessionId },
    include: { attendance: true, entry: { include: { room: true, offering: { include: { course: true, group: true } } } } },
  });
  // Ownership enforced on the server; other faculty see a 404.
  if (!s || s.entry.offering.facultyId !== user.id) notFound();
  const students = await db.enrollment.findMany({ where: { groupId: s.entry.offering.groupId }, include: { student: true }, orderBy: { student: { name: "asc" } } });
  const existing = Object.fromEntries(s.attendance.map((a) => [a.studentId, a.status]));
  return (
    <main className="mx-auto max-w-2xl space-y-4 p-6">
      <h1 className="text-xl font-semibold">{s.entry.offering.course.code}: {s.date.toISOString().slice(0, 10)}</h1>
      <p className="text-sm text-gray-600">Group {s.entry.offering.group.name} · Room {s.entry.room.name}</p>
      {students.length === 0 ? <p className="text-sm text-gray-600">No students are enrolled in this group.</p> :
        <AttendanceForm sessionId={s.id} students={students.map((e) => ({ id: e.studentId, name: e.student.name, status: existing[e.studentId] ?? "PRESENT" }))} />}
    </main>
  );
}
