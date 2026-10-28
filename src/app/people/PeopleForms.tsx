"use client";
import { useFormState } from "react-dom";
import { createUser, enrollStudent } from "../actions/people";
import { Btn, Msg, Select, inp } from "../admin/AdminForms";

type Opt = { id: string; name?: string; code?: string };
const ROLES = ["ADMIN", "COORDINATOR", "EXAM_OFFICER", "FACULTY", "STUDENT"];

export function UserForm({ departments }: { departments: Opt[] }) {
  const [s, a] = useFormState(createUser, undefined);
  return (
    <form action={a} className="grid gap-2 rounded border bg-white p-3 md:grid-cols-2">
      <h2 className="font-medium md:col-span-2">Create account</h2>
      <label className="text-sm">Full name<input name="name" required className={inp} /></label>
      <label className="text-sm">Email<input name="email" type="email" required autoComplete="off" className={inp} /></label>
      <label className="text-sm">Role<select name="role" defaultValue="STUDENT" className={inp}>{ROLES.map((r) => <option key={r}>{r}</option>)}</select></label>
      <label className="text-sm">Department<select name="departmentId" defaultValue="" className={inp}><option value="">None (admin / exam officer)</option>{departments.map((d) => <option key={d.id} value={d.id}>{d.code} – {d.name}</option>)}</select></label>
      <label className="text-sm md:col-span-2">Temporary password (min 10 characters; share it securely)<input name="password" type="password" minLength={10} required autoComplete="new-password" className={inp} /></label>
      <div className="md:col-span-2"><Msg s={s} /><Btn /></div>
    </form>
  );
}

export function EnrollForm({ students, groups }: { students: Opt[]; groups: Opt[] }) {
  const [s, a] = useFormState(enrollStudent, undefined);
  return (
    <form action={a} className="grid gap-2 rounded border bg-white p-3 md:grid-cols-2">
      <h2 className="font-medium md:col-span-2">Enroll student in group</h2>
      <Select name="studentId" label="Student" items={students} text={(o) => o.name!} />
      <Select name="groupId" label="Group" items={groups} text={(o) => o.name!} />
      <div className="md:col-span-2"><Msg s={s} /><Btn /></div>
    </form>
  );
}
