// STAGING ONLY. Creates fake students and signed session tokens for load testing.
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import { SignJWT } from "jose";
import { mkdirSync, writeFileSync } from "node:fs";

const db = new PrismaClient();
const N = Number(process.argv[2] ?? 10000);

async function main() {
  if (!process.env.AUTH_SECRET) throw new Error("AUTH_SECRET missing");
  const secret = new TextEncoder().encode(process.env.AUTH_SECRET);
  const group = await db.studentGroup.findFirstOrThrow();
  const passwordHash = await bcrypt.hash(crypto.randomUUID(), 4); // random, never used to log in
  await db.user.createMany({
    data: Array.from({ length: N }, (_, i) => ({
      email: `load${i}@load.test`, name: `Load User ${i}`, role: "STUDENT" as const, passwordHash, departmentId: group.departmentId,
    })),
    skipDuplicates: true,
  });
  const users = await db.user.findMany({ where: { email: { endsWith: "@load.test" } }, select: { id: true } });
  await db.enrollment.createMany({ data: users.map((u) => ({ studentId: u.id, groupId: group.id })), skipDuplicates: true });
  const now = Math.floor(Date.now() / 1000);
  const tokens = await Promise.all(users.map((u) =>
    new SignJWT({ sub: u.id, st: now }).setProtectedHeader({ alg: "HS256" }).setIssuedAt(now).setExpirationTime(now + 3600).sign(secret)));
  mkdirSync("loadtest", { recursive: true });
  writeFileSync("loadtest/tokens.json", JSON.stringify(tokens));
  console.log(`Wrote ${tokens.length} tokens to loadtest/tokens.json`);
}
main().finally(() => db.$disconnect());
