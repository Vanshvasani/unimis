"use client";
import { useFormState } from "react-dom";
import { createDepartment, createTerm, createGroup } from "../actions/academic";
import { Btn, Msg, Select, inp } from "../admin/AdminForms";

export function DeptForm() {
  const [s, a] = useFormState(createDepartment, undefined);
  return (
    <form action={a} className="space-y-2 rounded border bg-white p-3">
      <h2 className="font-medium">Add department</h2>
      <label className="block text-sm">Code<input name="code" required className={inp} /></label>
      <label className="block text-sm">Name<input name="name" required className={inp} /></label>
      <Msg s={s} /><Btn />
    </form>
  );
}
export function TermForm() {
  const [s, a] = useFormState(createTerm, undefined);
  return (
    <form action={a} className="space-y-2 rounded border bg-white p-3">
      <h2 className="font-medium">Add academic term</h2>
      <label className="block text-sm">Name (e.g. Spring 2027)<input name="name" required className={inp} /></label>
      <label className="block text-sm">Start<input name="startDate" type="date" required className={inp} /></label>
      <label className="block text-sm">End<input name="endDate" type="date" required className={inp} /></label>
      <Msg s={s} /><Btn />
    </form>
  );
}
export function GroupForm({ departments }: { departments: { id: string; code: string; name: string }[] }) {
  const [s, a] = useFormState(createGroup, undefined);
  return (
    <form action={a} className="space-y-2 rounded border bg-white p-3">
      <h2 className="font-medium">Add student group</h2>
      <label className="block text-sm">Name (e.g. CS-Y2-A)<input name="name" required className={inp} /></label>
      <Select name="departmentId" label="Department" items={departments} text={(o) => `${o.code} – ${o.name}`} />
      <Msg s={s} /><Btn />
    </form>
  );
}
