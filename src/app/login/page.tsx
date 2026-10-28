"use client";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useFormState, useFormStatus } from "react-dom";
import { login } from "../actions/auth";
import { IDLE_SECONDS } from "@/lib/session-config";

function Notice() {
  const reason = useSearchParams().get("reason");
  if (reason !== "timeout") return null;
  return <p role="status" className="rounded bg-amber-100 p-2 text-sm text-amber-900">You were signed out after {Math.round(IDLE_SECONDS / 60)} minutes of inactivity. Please sign in again.</p>;
}
function Submit() {
  const { pending } = useFormStatus();
  return <button disabled={pending} className="w-full rounded-full bg-indigo-600 px-4 py-2 text-white disabled:opacity-60">{pending ? "Signing in…" : "Sign in"}</button>;
}

export default function LoginPage() {
  const [state, action] = useFormState(login, undefined);
  return (
    <main className="grid min-h-screen md:grid-cols-2">
      <section className="hidden flex-col justify-between bg-ink p-10 text-white md:flex">
        <span className="font-display text-2xl">Uni<span className="text-saffron-400">MIS</span></span>
        <p className="font-display text-4xl leading-tight">One system for every<br />timetable, exam<br />and <span className="text-saffron-400">attendance</span> sheet.</p>
        <p className="text-xs text-white/60">Sessions end automatically after inactivity.</p>
      </section>
      <section className="flex flex-col justify-center gap-4 p-8">
        <div className="mx-auto w-full max-w-sm space-y-4">
          <h1 className="text-2xl">Sign in</h1>
          <Suspense><Notice /></Suspense>
          <form action={action} className="space-y-3">
            <label className="block text-sm">Email<input name="email" type="email" required autoComplete="username" className="mt-1 w-full rounded border p-2" /></label>
            <label className="block text-sm">Password<input name="password" type="password" required autoComplete="current-password" className="mt-1 w-full rounded border p-2" /></label>
            {state?.error && <p role="alert" className="text-sm text-red-600">{state.error}</p>}
            <Submit />
          </form>

        </div>
      </section>
    </main>
  );
}
