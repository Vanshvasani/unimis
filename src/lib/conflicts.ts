import { db } from "./db";

export type Conflict = { type: "ROOM" | "FACULTY" | "GROUP"; entryId: string; message: string };

export const fmt = (m: number) =>
  `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

/** Finds overlapping non-cancelled entries in the same term sharing a room, faculty member or student group. */
export async function findConflicts(input: {
  offeringId: string; roomId: string; dayOfWeek: number; startMin: number; endMin: number; excludeId?: string;
}): Promise<Conflict[]> {
  const offering = await db.courseOffering.findUniqueOrThrow({ where: { id: input.offeringId } });

  const clashing = await db.timetableEntry.findMany({
    where: {
      id: input.excludeId ? { not: input.excludeId } : undefined,
      status: { not: "CANCELLED" },
      dayOfWeek: input.dayOfWeek,
      startMin: { lt: input.endMin },
      endMin: { gt: input.startMin },
      offering: { termId: offering.termId },
      OR: [
        { roomId: input.roomId },
        { offering: { facultyId: offering.facultyId } },
        { offering: { groupId: offering.groupId } },
      ],
    },
    include: { room: true, offering: { include: { course: true, faculty: true, group: true } } },
  });

  const out: Conflict[] = [];
  for (const e of clashing) {
    const when = `${e.offering.course.code} ${fmt(e.startMin)}-${fmt(e.endMin)}`;
    if (e.roomId === input.roomId)
      out.push({ type: "ROOM", entryId: e.id, message: `Room ${e.room.name} is already used by ${when}` });
    if (e.offering.facultyId === offering.facultyId)
      out.push({ type: "FACULTY", entryId: e.id, message: `${e.offering.faculty.name} already teaches ${when}` });
    if (e.offering.groupId === offering.groupId)
      out.push({ type: "GROUP", entryId: e.id, message: `Group ${e.offering.group.name} already has ${when}` });
  }
  return out;
}
