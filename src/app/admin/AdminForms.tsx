"use client";
import { useFormState, useFormStatus } from "react-dom";
import { createRoom, createCourse, createOffering, type S } from "../actions/admin";

type Opt = { id: string; name?: string; code?: string; title?: string };
export const inp = "mt-1 w-full rounded border p-2";

export function Btn() {
  const { pending } = useFormStatus();
  return <button disabled={pending} className="rounded bg-indigo-600 px-3 py-1 text-sm text-white disabled:opacity-60">{pending ? "Saving…" : "Save"}</button>;
}
export function Msg({ s }: { s: S }) {
  if (s?.error) return <p role="alert" className="text-sm text-red-600">{s.error}</p>;
  if (s?.ok) return <p role="status" className="text-sm text-emerald-700">Saved.</p>;
  return null;
}
export const Select = ({ name, label, items, text }: { name: string; label: string; items: Opt[]; text: (o: Opt) => string }) => (
  <label className="block text-sm">{label}
    <select name={name} required defaultValue="" className={inp}>
      <option value="" disabled>Select…</option>
      {items.map((o) => <option key={o.id} value={o.id}>{text(o)}</option>)}
    </select>
  </label>
);

export function RoomForm({ campusId }: { campusId: string }) {
  const [s, a] = useFormState(createRoom, undefined);
  return (
    <form action={a} className="space-y-2 rounded border bg-white p-3">
      <h2 className="font-medium">Add room</h2>
      <input type="hidden" name="campusId" value={campusId} />
      <label className="block text-sm">Name<input name="name" required className={inp} /></label>
      <label className="block text-sm">Capacity<input name="capacity" type="number" min={1} required className={inp} /></label>
      <Msg s={s} /><Btn />
    </form>
  );
}
export function CourseForm({ departments }: { departments: Opt[] }) {
  const [s, a] = useFormState(createCourse, undefined);
  return (
    <form action={a} className="space-y-2 rounded border bg-white p-3">
      <h2 className="font-medium">Add course</h2>
      <label className="block text-sm">Code<input name="code" required className={inp} /></label>
      <label className="block text-sm">Title<input name="title" required className={inp} /></label>
      <label className="block text-sm">Credits<input name="credits" type="number" min={1} defaultValue={3} className={inp} /></label>
      <Select name="departmentId" label="Department" items={departments} text={(o) => `${o.code} – ${o.name}`} />
      <Msg s={s} /><Btn />
    </form>
  );
}
export function OfferingForm(p: { courses: Opt[]; terms: Opt[]; faculty: Opt[]; groups: Opt[] }) {
  const [s, a] = useFormState(createOffering, undefined);
  return (
    <form action={a} className="grid gap-2 rounded border bg-white p-3 md:grid-cols-2">
      <h2 className="font-medium md:col-span-2">Create course offering (assigns faculty and group)</h2>
      <Select name="courseId" label="Course" items={p.courses} text={(o) => `${o.code} ${o.title}`} />
      <Select name="termId" label="Term" items={p.terms} text={(o) => o.name!} />
      <Select name="facultyId" label="Faculty" items={p.faculty} text={(o) => o.name!} />
      <Select name="groupId" label="Student group" items={p.groups} text={(o) => o.name!} />
      <div className="md:col-span-2"><Msg s={s} /><Btn /></div>
    </form>
  );
}
