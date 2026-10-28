"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateExam } from "@/app/actions/exams";
import type { Result } from "@/app/actions/timetable";

type Opt = { id: string; label: string };
const toMin = (t: string) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
const c = "mt-1 w-full rounded border p-2";

export default function EditExamForm({ id, courses, groups, rooms, d }: {
  id: string; courses: Opt[]; groups: Opt[]; rooms: Opt[];
  d: { courseId: string; groupId: string; roomId: string; date: string; start: string; end: string };
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [res, setRes] = useState<Result | null>(null);
  const sel = (name: string, label: string, items: Opt[], def: string) => (
    <label className="text-sm">{label}<select name={name} defaultValue={def} className={c}>{items.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}</select></label>);
  return (
    <form className="grid gap-2 rounded border bg-white p-3 md:grid-cols-3" action={(fd) => start(async () => {
      const r = await updateExam(id, { courseId: fd.get("courseId"), groupId: fd.get("groupId"), roomId: fd.get("roomId"), date: fd.get("date"), startMin: toMin(String(fd.get("start"))), endMin: toMin(String(fd.get("end"))) });
      setRes(r); if (r.ok) router.push("/exams");
    })}>
      {sel("courseId", "Course", courses, d.courseId)}{sel("groupId", "Group", groups, d.groupId)}{sel("roomId", "Room", rooms, d.roomId)}
      <label className="text-sm">Date<input name="date" type="date" required defaultValue={d.date} className={c} /></label>
      <label className="text-sm">Start<input name="start" type="time" required defaultValue={d.start} className={c} /></label>
      <label className="text-sm">End<input name="end" type="time" required defaultValue={d.end} className={c} /></label>
      <div className="md:col-span-3"><button disabled={pending} className="rounded bg-indigo-600 px-3 py-2 text-sm text-white disabled:opacity-60">{pending ? "Checking…" : "Check & save"}</button></div>
      {res && !res.ok && <div role="alert" className="rounded bg-red-50 p-2 text-sm text-red-800 md:col-span-3"><b>{res.error}</b><ul className="list-disc pl-5">{res.conflicts?.map((x, i) => <li key={i}>[{x.type}] {x.message}</li>)}</ul></div>}
    </form>
  );
}
