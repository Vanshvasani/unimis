import { PrismaClient, type Role } from "@prisma/client";
import bcrypt from "bcrypt";
const db = new PrismaClient();

async function main() {
  if (await db.user.findUnique({ where: { email: "admin@demo.test" } })) {
    console.log("Already seeded. Use `npx prisma migrate reset` to start over.");
    return;
  }
  const hash = await bcrypt.hash("Demo@12345", 10); // DEMO password, local use only
  const campus = await db.campus.create({ data: { name: "Main Campus" } });
  await db.room.createMany({ data: [
    { name: "A-101", capacity: 60, campusId: campus.id },
    { name: "A-102", capacity: 40, campusId: campus.id },
  ] });
  const cs = await db.department.create({ data: { code: "CS", name: "Computer Science" } });
  const me = await db.department.create({ data: { code: "ME", name: "Mechanical Engineering" } });
  const term = await db.term.create({ data: { name: "Fall 2026", startDate: new Date("2026-09-01"), endDate: new Date("2026-12-15") } });
  const mk = (email: string, name: string, role: Role, departmentId?: string) =>
    db.user.create({ data: { email, name, role, passwordHash: hash, departmentId } });

  await mk("admin@demo.test", "Demo Admin", "ADMIN");
  await mk("coordinator.cs@demo.test", "Demo Coordinator (CS)", "COORDINATOR", cs.id);
  await mk("exams@demo.test", "Demo Exam Officer", "EXAM_OFFICER");
  const fac = await mk("faculty@demo.test", "Demo Faculty", "FACULTY", cs.id);
  const fac2 = await mk("faculty2@demo.test", "Demo Faculty Two", "FACULTY", cs.id);
  const group = await db.studentGroup.create({ data: { name: "CS-Y1-A", departmentId: cs.id } });
  for (let i = 1; i <= 5; i++) {
    const s = await mk(`student${i}@demo.test`, `Demo Student ${i}`, "STUDENT", cs.id);
    await db.enrollment.create({ data: { studentId: s.id, groupId: group.id } });
  }
  const c1 = await db.course.create({ data: { code: "CS101", title: "Intro to Programming", departmentId: cs.id } });
  const c2 = await db.course.create({ data: { code: "CS102", title: "Discrete Mathematics", departmentId: cs.id } });
  await db.course.create({ data: { code: "ME101", title: "Engineering Mechanics", departmentId: me.id } });
  await db.courseOffering.createMany({ data: [
    { courseId: c1.id, termId: term.id, facultyId: fac.id, groupId: group.id },
    { courseId: c2.id, termId: term.id, facultyId: fac2.id, groupId: group.id },
  ] });
  console.log("Seeded demo data.");
}
main().finally(() => db.$disconnect());
