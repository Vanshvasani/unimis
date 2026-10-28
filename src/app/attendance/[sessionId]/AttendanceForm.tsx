"use client";
import { useState, useTransition } from "react";
import { markAttendance } from "@/app/actions/attendance";

const options = ["PRESENT", "ABSENT", "LATE", "EXCUSED"] as const;
type St = (typeof options)[number];

export default function AttendanceForm({ sessionId, students }: { sessionId: string; students: { id: string; name: string; status: string }[] }) {
  const [marks, setMarks] = useState<Record<string, St>>(Object.fromEntries(students.map((s) => [s.id, s.status as St])));
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const save = () => start(async () => {
    try {
      const r = await markAttendance({ sessionId, marks: Object.entries(marks).map(([studentId, status]) => ({ studentId, status })) });
      setMsg({ ok: r.ok, text: r.ok ? "Attendance saved." : r.error ?? "Could not save." });
    } catch { setMsg({ ok: false, text: "You are not allowed to do that." }); }
  });
  return (
    <div className="space-y-3">
      <button type="button" onClick={() => setMarks(Object.fromEntries(students.map((s) => [s.id, "PRESENT" as St])))} className="rounded border px-3 py-1 text-sm">Mark all present</button>
      <ul className="divide-y rounded border bg-white">
        {students.map((s) => (
          <li key={s.id} className="flex items-center justify-between p-2 text-sm">
            <label htmlFor={`s-${s.id}`}>{s.name}</label>
            <select id={`s-${s.id}`} value={marks[s.id]} onChange={(e) => setMarks({ ...marks, [s.id]: e.target.value as St })} className="rounded border p-1">
              {options.map((o) => <option key={o}>{o}</option>)}
            </select>
          </li>))}
      </ul>
      <button onClick={save} disabled={pending} className="rounded bg-indigo-600 px-4 py-2 text-sm text-white disabled:opacity-60">{pending ? "Saving…" : "Save attendance"}</button>
      {msg && <p role={msg.ok ? "status" : "alert"} className={`text-sm ${msg.ok ? "text-emerald-700" : "text-red-700"}`}>{msg.text}</p>}
    </div>
  );
}
