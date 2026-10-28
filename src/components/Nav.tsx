"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Role } from "@prisma/client";
import { can } from "@/lib/rbac";
import { logout } from "@/app/actions/auth";

export default function Nav({ role, name }: { role: Role; name: string }) {
  const pathname = usePathname();

  const links = [
    { href: "/dashboard", label: "Dashboard", icon: "📊", show: true },
    { href: "/timetable", label: "Timetable", icon: "🗓️", show: can(role, "timetable.manage") },
    { href: "/admin", label: "Offerings", icon: "📚", show: can(role, "timetable.manage") },
    { href: "/academic", label: "Academic", icon: "🏛️", show: can(role, "timetable.manage") },
    { href: "/people", label: "People", icon: "👥", show: can(role, "timetable.manage") },
    { href: "/exams", label: "Exams", icon: "📝", show: true },
    { href: "/attendance", label: "Attendance", icon: "✅", show: can(role, "attendance.mark") },
    { href: "/my", label: "My Records", icon: "🎓", show: role === "STUDENT" },
    { href: "/reports", label: "Reports", icon: "📈", show: can(role, "report.view") },
    { href: "/audit", label: "Audit Log", icon: "🛡️", show: can(role, "audit.view") },
  ].filter((l) => l.show);

  return (
    <aside className="w-full shrink-0 border-b border-line bg-[#070a0f] md:min-h-screen md:w-64 md:border-b-0 md:border-r">
      <div className="flex h-full flex-col justify-between p-4 md:fixed md:top-0 md:bottom-0 md:w-64">
        <div className="space-y-6">
          {/* Logo / Brand Header */}
          <div className="flex items-center justify-between px-2 pt-1 pb-2">
            <Link href="/dashboard" className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 text-lg font-bold text-white shadow-md">
                U
              </span>
              <span className="font-display text-xl font-semibold tracking-tight text-white">
                Uni<span className="text-amber-400">MIS</span>
              </span>
            </Link>
            <span className="rounded bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium tracking-wide uppercase text-amber-300 md:hidden">
              {role}
            </span>
          </div>

          {/* Navigation Links */}
          <nav aria-label="Main Navigation" className="overflow-x-auto md:overflow-visible">
            <p className="mb-2 hidden px-2 text-[10px] font-semibold tracking-wider uppercase text-slate-500 md:block">
              Main Menu
            </p>
            <ul className="flex gap-1 md:flex-col md:space-y-1">
              {links.map((l) => {
                const isActive = pathname === l.href;
                return (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                        isActive
                          ? "bg-amber-500/15 text-amber-300 shadow-sm border border-amber-500/30"
                          : "text-slate-400 hover:bg-white/[0.04] hover:text-slate-200"
                      }`}
                    >
                      <span className="text-base">{l.icon}</span>
                      <span className="whitespace-nowrap">{l.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>

        {/* User Card & Sign Out */}
        <div className="mt-6 border-t border-line/60 pt-4">
          <div className="mb-3 hidden items-center gap-3 px-2 md:flex">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-800 text-xs font-semibold text-slate-200">
              {name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium text-slate-200">{name}</p>
              <p className="text-[10px] text-amber-400/90 font-mono capitalize">{role.toLowerCase()}</p>
            </div>
          </div>
          <form action={logout}>
            <button
              type="submit"
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-red-500/20 bg-red-950/20 px-3 py-2 text-xs font-medium text-red-300 transition-colors hover:bg-red-900/30 hover:border-red-500/40"
            >
              <span>🚪</span>
              <span>Sign out</span>
            </button>
          </form>
        </div>
      </div>
    </aside>
  );
}
