import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { assertCan } from "@/lib/rbac";

const PAGE = 50;

export default async function AuditPage({ searchParams }: { searchParams: { q?: string; page?: string } }) {
  const user = await requireUser();
  assertCan(user, "audit.view");
  const q = searchParams.q?.trim();
  const page = Math.max(1, Number(searchParams.page) || 1);
  const where = q ? { action: { startsWith: q } } : {};
  const [rows, total] = await Promise.all([
    db.auditLog.findMany({ where, include: { actor: true }, orderBy: { createdAt: "desc" }, take: PAGE, skip: (page - 1) * PAGE }),
    db.auditLog.count({ where }),
  ]);
  const pages = Math.max(1, Math.ceil(total / PAGE));
  const href = (p: number) => `/audit?${new URLSearchParams({ ...(q ? { q } : {}), page: String(p) })}`;
  return (
    <main className="mx-auto max-w-4xl space-y-4 p-6">
      <h1 className="text-xl font-semibold">Audit log</h1>
      <form role="search" className="text-sm"><label>Action starts with<input name="q" defaultValue={q} placeholder="e.g. timetable. or user." className="ml-1 rounded border p-1" /></label> <button className="ml-1 rounded border px-3 py-1">Filter</button></form>
      {rows.length === 0 ? <p className="text-sm text-gray-600">No audit entries.</p> : (
        <div className="overflow-x-auto"><table className="w-full text-sm">
          <thead><tr className="text-left"><th>When (UTC)</th><th>Actor</th><th>Action</th><th>Entity</th><th>Detail</th></tr></thead>
          <tbody>{rows.map((r) => (
            <tr key={r.id} className="border-t align-top">
              <td>{r.createdAt.toISOString().replace("T", " ").slice(0, 19)}</td><td>{r.actor.name}</td><td>{r.action}</td><td>{r.entity}</td>
              <td>{r.detail ? <details><summary className="cursor-pointer">View</summary><pre className="max-w-xs overflow-x-auto text-xs">{JSON.stringify(r.detail, null, 1)}</pre></details> : "–"}</td>
            </tr>))}</tbody>
        </table></div>)}
      <nav aria-label="Pagination" className="flex items-center gap-3 text-sm">
        {page > 1 && <Link href={href(page - 1)} className="underline">Previous</Link>}
        <span>Page {page} of {pages}</span>
        {page < pages && <Link href={href(page + 1)} className="underline">Next</Link>}
      </nav>
    </main>
  );
}
