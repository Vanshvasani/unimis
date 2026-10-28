"use client";
import { useEffect, useRef, useState } from "react";
import { IDLE_SECONDS, KEEPALIVE_SECONDS } from "@/lib/session-config";

const KEY = "mis_last_activity"; // shared across tabs via localStorage
const WARN = Math.min(60, Math.floor(IDLE_SECONDS / 3));
const read = () => { try { return Number(localStorage.getItem(KEY)) || Date.now(); } catch { return Date.now(); } };
const write = (t: number) => { try { localStorage.setItem(KEY, String(t)); } catch { /* storage blocked */ } };

export default function IdleTimer() {
  const [left, setLeft] = useState<number | null>(null);
  const lastPing = useRef(Date.now());

  useEffect(() => {
    write(Date.now());
    let lastWrite = 0;
    const mark = () => { const n = Date.now(); if (n - lastWrite > 1000) { lastWrite = n; write(n); } };
    const events = ["pointerdown", "keydown", "scroll", "touchstart", "mousemove"];
    events.forEach((e) => window.addEventListener(e, mark, { passive: true }));

    const tick = async () => {
      const now = Date.now(), last = read(), idle = (now - last) / 1000;
      if (idle >= IDLE_SECONDS) { window.location.assign("/api/logout"); return; }
      setLeft(idle >= IDLE_SECONDS - WARN ? Math.ceil(IDLE_SECONDS - idle) : null);
      if (last > lastPing.current && now - lastPing.current >= KEEPALIVE_SECONDS * 1000) {
        lastPing.current = now;
        try {
          const r = await fetch("/api/keepalive", { method: "POST", cache: "no-store" });
          if (r.status === 401) window.location.assign("/api/logout");
        } catch { /* offline: retry on next activity */ }
      }
    };
    const id = setInterval(tick, 1000);
    document.addEventListener("visibilitychange", tick); // check immediately after sleep/wake
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
      events.forEach((e) => window.removeEventListener(e, mark));
    };
  }, []);

  if (left === null) return null;
  return (
    <div role="alertdialog" aria-live="assertive" aria-label="Inactivity warning"
      className="fixed inset-x-4 bottom-4 z-50 mx-auto max-w-sm rounded-xl bg-ink p-4 text-sm text-white shadow-xl">
      <p>You&apos;ll be signed out in <b>{left}s</b> because of inactivity.</p>
      <button className="mt-2 rounded-full bg-saffron-400 px-3 py-1 font-medium text-ink">Stay signed in</button>
    </div>
  );
}
