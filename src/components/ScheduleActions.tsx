"use client";
import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { publishEntry, cancelEntry, type Result } from "@/app/actions/timetable";
import { publishExam, cancelExam } from "@/app/actions/exams";

export default function ScheduleActions({ kind, id, status }: { kind: "entry" | "exam"; id: string; status: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [res, setRes] = useState<Result | null>(null);
  const run = (fn: (id: string) => Promise<Result>) =>
    start(async () => { setRes(await fn(id)); router.refresh(); });
  const [pub, cancel] = kind === "entry" ? [publishEntry, cancelEntry] : [publishExam, cancelExam];
  return (
    <div>
      <div className="flex gap-2">
        {status !== "CANCELLED" && <Link href={kind === "entry" ? `/timetable/${id}/edit` : `/exams/${id}/edit`} className="rounded border px-2 py-1 text-xs">Edit</Link>}
        {status === "DRAFT" && <button disabled={pending} onClick={() => run(pub)} className="rounded bg-emerald-600 px-2 py-1 text-xs text-white disabled:opacity-60">Publish</button>}
        {status !== "CANCELLED" && <button disabled={pending} onClick={() => confirm("Cancel this schedule?") && run(cancel)} className="rounded border px-2 py-1 text-xs disabled:opacity-60">Cancel</button>}
      </div>
      {res && !res.ok && (
        <div role="alert" className="mt-1 text-xs text-red-700">
          {res.error}
          <ul className="list-disc pl-4">{res.conflicts?.map((c, i) => <li key={i}>{c.message}</li>)}</ul>
        </div>
      )}
    </div>
  );
}
