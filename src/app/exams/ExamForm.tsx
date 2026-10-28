"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createExam } from "../actions/exams";
import type { Result } from "../actions/timetable";

type Opt = { id: string; label: string };
const toMin = (t: string) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };

export default function ExamForm({ courses, groups, rooms }: { courses: Opt[]; groups: Opt[]; rooms: Opt[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [res, setRes] = useState<Result | null>(null);
  const sel = (name: string, label: string, items: Opt[]) => (
    <label className="text-sm">{label}
      <select name={name} required defaultValue="" className="mt-1 w-full rounded border p-2"><option value="" disabled>Select…</option>{items.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}</select>
    </label>);
  return (
    <form className="grid gap-2 rounded border bg-white p-3 md:grid-cols-3" action={(fd) => start(async () => {
      const r = await createExam({ courseId: fd.get("courseId"), groupId: fd.get("groupId"), roomId: fd.get("roomId"), date: fd.get("date"), startMin: toMin(String(fd.get("start"))), endMin: toMin(String(fd.get("end"))) });
      setRes(r); if (r.ok) router.refresh();
    })}>
      <h2 className="font-medium md:col-span-3">Add draft exam</h2>
      {sel("courseId", "Course", courses)}{sel("groupId", "Student group", groups)}{sel("roomId", "Room", rooms)}
      <label className="text-sm">Date<input name="date" type="date" required className="mt-1 w-full rounded border p-2" /></label>
      <label className="text-sm">Start<input name="start" type="time" required defaultValue="10:00" className="mt-1 w-full rounded border p-2" /></label>
      <label className="text-sm">End<input name="end" type="time" required defaultValue="12:00" className="mt-1 w-full rounded border p-2" /></label>
      <div className="md:col-span-3"><button disabled={pending} className="rounded bg-indigo-600 px-3 py-2 text-sm text-white disabled:opacity-60">{pending ? "Checking…" : "Check & save draft"}</button></div>
      {res && !res.ok && <div role="alert" className="md:col-span-3 rounded bg-red-50 p-2 text-sm text-red-800"><b>{res.error}</b><ul className="list-disc pl-5">{res.conflicts?.map((x, i) => <li key={i}>[{x.type}] {x.message}</li>)}</ul></div>}
      {res?.ok && <p role="status" className="md:col-span-3 text-sm text-emerald-700">Draft saved.</p>}
    </form>
  );
}
