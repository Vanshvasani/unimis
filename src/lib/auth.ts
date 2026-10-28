import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";
import type { User } from "@prisma/client";
import { db } from "./db";
import { COOKIE, COOKIE_SECONDS, ABSOLUTE_SECONDS, cookieOptions } from "./session-config";

const key = () => {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error("AUTH_SECRET is not set");
  return new TextEncoder().encode(s);
};

export async function createSession(userId: string) {
  const now = Math.floor(Date.now() / 1000);
  const token = await new SignJWT({ sub: userId, st: now })
    .setProtectedHeader({ alg: "HS256" }).setIssuedAt(now).setExpirationTime(now + COOKIE_SECONDS).sign(key());
  cookies().set(COOKIE, token, cookieOptions());
}

export function destroySession() { cookies().delete(COOKIE); }

// Short-lived per-instance cache so thousands of users don't each hit the DB on every request.
// Trade-off: a deactivation/role change takes up to TTL to reach other instances.
const TTL_MS = 30_000, MAX = 20_000;
const userCache = new Map<string, { user: User | null; exp: number }>();
export const invalidateUser = (id: string) => userCache.delete(id);

async function loadUser(id: string) {
  const hit = userCache.get(id);
  if (hit && hit.exp > Date.now()) return hit.user;
  const u = await db.user.findUnique({ where: { id } });
  const user = u && u.active ? u : null;
  if (userCache.size >= MAX) userCache.delete(userCache.keys().next().value as string);
  userCache.set(id, { user, exp: Date.now() + TTL_MS });
  return user;
}

// React cache(): layout and page share one lookup per request.
export const getUser = cache(async () => {
  const token = cookies().get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key()); // rejects expired tokens
    if (Math.floor(Date.now() / 1000) - Number(payload.st) > ABSOLUTE_SECONDS) return null;
    return await loadUser(String(payload.sub));
  } catch { return null; }
});

export async function requireUser() {
  const u = await getUser();
  if (!u) redirect("/login");
  return u;
}
