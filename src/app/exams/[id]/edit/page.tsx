import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { assertCan } from "@/lib/rbac";
import { fmt } from "@/lib/conflicts";
import EditExamForm from "./EditExamForm";

export default async function EditExam({ params }: { params: { id: string } }) {
  const user = await requireUser();
  assertCan(user, "exam.manage");
  const e = await db.examSchedule.findUnique({ where: { id: params.id } });
  if (!e) notFound();
  if (e.status === "CANCELLED") return <main className="p-6 text-sm">Cancelled exams cannot be edited.</main>;
  const [courses, groups, rooms] = await Promise.all([
    db.course.findMany({ orderBy: { code: "asc" } }), db.studentGroup.findMany({ orderBy: { name: "asc" } }), db.room.findMany({ orderBy: { name: "asc" } }),
  ]);
  return (
    <main className="mx-auto max-w-3xl space-y-4 p-6">
      <h1 className="text-xl font-semibold">Edit exam ({e.status})</h1>
      <EditExamForm id={e.id}
        courses={courses.map((x) => ({ id: x.id, label: `${x.code} ${x.title}` }))}
        groups={groups.map((x) => ({ id: x.id, label: x.name }))}
        rooms={rooms.map((x) => ({ id: x.id, label: x.name }))}
        d={{ courseId: e.courseId, groupId: e.groupId, roomId: e.roomId, date: e.date.toISOString().slice(0, 10), start: fmt(e.startMin), end: fmt(e.endMin) }} />
    </main>
  );
}
