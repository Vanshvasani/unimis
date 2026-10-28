"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createEntry, type Result } from "../actions/timetable";

type Opt = { id: string; label: string };
const toMin = (t: string) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };

export default function EntryForm({ offerings, rooms }: { offerings: Opt[]; rooms: Opt[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [res, setRes] = useState<Result | null>(null);

  function submit(fd: FormData) {
    start(async () => {
      const r = await createEntry({
        offeringId: fd.get("offeringId"), roomId: fd.get("roomId"), dayOfWeek: Number(fd.get("dayOfWeek")),
        startMin: toMin(String(fd.get("start"))), endMin: toMin(String(fd.get("end"))),
      });
      setRes(r);
      if (r.ok) router.refresh();
    });
  }
  const c = "mt-1 w-full rounded border p-2";
  return (
    <form action={submit} className="grid gap-2 rounded border bg-white p-3 md:grid-cols-3">
      <h2 className="font-medium md:col-span-3">Add draft class slot</h2>
      <label className="text-sm">Offering<select name="offeringId" required defaultValue="" className={c}><option value="" disabled>Select…</option>{offerings.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}</select></label>
      <label className="text-sm">Room<select name="roomId" required defaultValue="" className={c}><option value="" disabled>Select…</option>{rooms.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}</select></label>
      <label className="text-sm">Day<select name="dayOfWeek" defaultValue="1" className={c}>{["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d, i) => <option key={d} value={i + 1}>{d}</option>)}</select></label>
      <label className="text-sm">Start<input name="start" type="time" required defaultValue="09:00" className={c} /></label>
      <label className="text-sm">End<input name="end" type="time" required defaultValue="10:00" className={c} /></label>
      <div className="flex items-end"><button disabled={pending} className="rounded bg-indigo-600 px-3 py-2 text-sm text-white disabled:opacity-60">{pending ? "Checking…" : "Check & save draft"}</button></div>
      {res && !res.ok && (
        <div role="alert" className="md:col-span-3 rounded bg-red-50 p-2 text-sm text-red-800">
          <b>{res.error}</b>
          <ul className="list-disc pl-5">{res.conflicts?.map((x, i) => <li key={i}>[{x.type}] {x.message}</li>)}</ul>
        </div>)}
      {res?.ok && <p role="status" className="md:col-span-3 text-sm text-emerald-700">Draft saved. Publish it from the table below.</p>}
    </form>
  );
}
