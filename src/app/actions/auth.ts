"use server";
import bcrypt from "bcrypt"; // native implementation: does not block the Node event loop
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { createSession, destroySession } from "@/lib/auth";

const schema = z.object({ email: z.string().email(), password: z.string().min(1) });

export async function login(_: { error?: string } | undefined, formData: FormData) {
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Enter a valid email and password." };
  const user = await db.user.findUnique({ where: { email: parsed.data.email.toLowerCase() } });
  const ok = user && user.active && (await bcrypt.compare(parsed.data.password, user.passwordHash));
  if (!user || !ok) return { error: "Invalid credentials." };
  await createSession(user.id);
  redirect("/dashboard");
}

export async function logout() {
  destroySession();
  redirect("/login");
}
