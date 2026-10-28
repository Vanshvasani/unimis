"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateEntry, type Result } from "@/app/actions/timetable";

type Opt = { id: string; label: string };
const toMin = (t: string) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
const c = "mt-1 w-full rounded border p-2";

export default function EditEntryForm({ id, locked, offerings, rooms, d }: {
  id: string; locked: boolean; offerings: Opt[]; rooms: Opt[];
  d: { offeringId: string; roomId: string; day: number; start: string; end: string };
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [res, setRes] = useState<Result | null>(null);
  const submit = (fd: FormData) => start(async () => {
    const r = await updateEntry(id, {
      offeringId: locked ? d.offeringId : fd.get("offeringId"), roomId: fd.get("roomId"),
      dayOfWeek: locked ? d.day : Number(fd.get("dayOfWeek")),
      startMin: toMin(String(fd.get("start"))), endMin: toMin(String(fd.get("end"))),
    });
    setRes(r);
    if (r.ok) router.push("/timetable");
  });
  return (
    <form action={submit} className="grid gap-2 rounded border bg-white p-3 md:grid-cols-3">
      {locked && <p className="text-sm text-gray-600 md:col-span-3">Published: only room and time can be changed.</p>}
      <label className="text-sm">Offering<select name="offeringId" disabled={locked} defaultValue={d.offeringId} className={c}>{offerings.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}</select></label>
      <label className="text-sm">Room<select name="roomId" defaultValue={d.roomId} className={c}>{rooms.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}</select></label>
      <label className="text-sm">Day<select name="dayOfWeek" disabled={locked} defaultValue={d.day} className={c}>{["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((x, i) => <option key={x} value={i + 1}>{x}</option>)}</select></label>
      <label className="text-sm">Start<input name="start" type="time" required defaultValue={d.start} className={c} /></label>
      <label className="text-sm">End<input name="end" type="time" required defaultValue={d.end} className={c} /></label>
      <div className="flex items-end"><button disabled={pending} className="rounded bg-indigo-600 px-3 py-2 text-sm text-white disabled:opacity-60">{pending ? "Checking…" : "Check & save"}</button></div>
      {res && !res.ok && (
        <div role="alert" className="rounded bg-red-50 p-2 text-sm text-red-800 md:col-span-3"><b>{res.error}</b>
          <ul className="list-disc pl-5">{res.conflicts?.map((x, i) => <li key={i}>[{x.type}] {x.message}</li>)}</ul></div>)}
    </form>
  );
}
