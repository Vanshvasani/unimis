"use server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { assertCan, Forbidden } from "@/lib/rbac";

const schema = z.object({
  sessionId: z.string().min(1),
  marks: z.array(z.object({ studentId: z.string(), status: z.enum(["PRESENT", "ABSENT", "LATE", "EXCUSED"]) })).min(1),
});

export async function markAttendance(raw: unknown): Promise<{ ok: boolean; error?: string }> {
  const user = await requireUser();
  assertCan(user, "attendance.mark");
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Invalid attendance data" };

  const session = await db.classSession.findUnique({
    where: { id: parsed.data.sessionId },
    include: { entry: { include: { offering: true } } },
  });
  if (!session) return { ok: false, error: "Session not found" };
  // Ownership: only the assigned instructor may mark.
  if (session.entry.offering.facultyId !== user.id) throw new Forbidden("Not your class");
  if (session.cancelled || session.entry.status !== "PUBLISHED") return { ok: false, error: "Session is not active" };
  if (session.date > new Date()) return { ok: false, error: "Cannot mark attendance for a future date" };

  // Only students enrolled in the offering's group may be marked.
  const enrolled = await db.enrollment.findMany({
    where: { groupId: session.entry.offering.groupId }, select: { studentId: true },
  });
  const allowed = new Set(enrolled.map((e) => e.studentId));
  if (parsed.data.marks.some((m) => !allowed.has(m.studentId)))
    return { ok: false, error: "A student is not enrolled in this class" };

  // One bulk upsert statement (values are bound parameters).
  const ids = parsed.data.marks.map((m) => m.studentId);
  const sts = parsed.data.marks.map((m) => m.status);
  await db.$executeRaw`
    INSERT INTO "Attendance" (id, "sessionId", "studentId", "markedById", status, "updatedAt")
    SELECT gen_random_uuid()::text, ${session.id}, t.sid, ${user.id}, t.st::"AttStatus", now()
    FROM unnest(${ids}::text[], ${sts}::text[]) AS t(sid, st)
    ON CONFLICT ("sessionId", "studentId")
    DO UPDATE SET status = EXCLUDED.status, "markedById" = EXCLUDED."markedById", "updatedAt" = now()`;
  await db.auditLog.create({ data: { action: "attendance.mark", entity: "ClassSession", entityId: session.id, actorId: user.id, detail: { count: parsed.data.marks.length } } });
  return { ok: true };
}
