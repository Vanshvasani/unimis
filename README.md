# University MIS ("Ink & Saffron")

Role-based university management system: timetables with conflict detection, exam schedules,
attendance tied to scheduled class sessions, reports, audit log, installable PWA, 15-minute
inactivity logout, and a scale-ready deployment stack (PgBouncer, nginx, 3 app replicas).

Stack: Next.js 14 (App Router, server actions) · TypeScript · Prisma · PostgreSQL · Tailwind CSS.

## Quick start (local development)

Requirements: Node 20+, Docker (for Postgres), internet access on first build (Google Fonts are fetched at build time, then self-hosted).

```bash
cp .env.example .env                 # then set AUTH_SECRET:  openssl rand -base64 32
docker compose up -d db              # Postgres on 127.0.0.1:5432 (uses DB_PASSWORD from .env)
npm install
npx prisma migrate dev --name init   # creates tables + indexes
npm run db:seed                      # demo data
npm run dev                          # http://localhost:3000
```

Keep the password inside `DATABASE_URL` and `DIRECT_URL` identical to `DB_PASSWORD`.

## Demo accounts (fictional, local only). Password for all: `Demo@12345`

| Role | Email |
|---|---|
| University Admin | admin@demo.test |
| Department Coordinator (CS) | coordinator.cs@demo.test |
| Exam Officer | exams@demo.test |
| Faculty | faculty@demo.test, faculty2@demo.test |
| Student | student1@demo.test … student5@demo.test |

Change or delete these before any real deployment.

## Permission matrix

| Permission | Admin | Dept Coord | Exam Officer | Faculty | Student |
|---|---|---|---|---|---|
| Departments, terms, rooms, courses, accounts | yes | - | - | - | - |
| Offerings, groups, enrollment | yes | own dept | - | - | - |
| Timetable create/edit/publish/cancel | yes | own dept | - | - | - |
| Exam schedules | yes | - | yes | - | - |
| Mark attendance | - | - | - | own classes | - |
| Reports | yes | own dept | - | - | - |
| Audit log | yes | - | - | - | - |
| View schedules/attendance | all | own dept | published exams | own | own only |

Enforced server-side in every server action and page (`src/lib/rbac.ts`); the UI only reflects it.

## Inactivity logout (15 min)

1. Browser timer counts activity across tabs, warns for the last 60 s, then signs out.
2. Server cookie lives 15 min + a keep-alive interval and is renewed by middleware on real requests.
3. Absolute session cap of 8 hours.

Test quickly: `NEXT_PUBLIC_IDLE_SECONDS=30 npm run dev`. Settings live in `src/lib/session-config.ts`.

## Production-style stack (3 replicas + PgBouncer + nginx)

```bash
cp .env.example .env                  # set DB_PASSWORD and AUTH_SECRET
docker compose up -d db
npx prisma migrate deploy             # uses DIRECT_URL (direct to Postgres)
npm run db:seed                       # first time only
docker compose up -d --build          # http://localhost
```

`COOKIE_SECURE: "false"` in docker-compose.yml is for plain-HTTP local testing only.
Put TLS in front for real use and remove it.

## Load test (staging only)

```bash
npm run loadtest:setup -- 10000       # creates fake users + tokens in loadtest/tokens.json (never commit)
k6 run -e BASE=http://localhost loadtest/k6.js
```

Capacity numbers (about 3-4 app replicas, 2 vCPU each, plus Postgres 4 vCPU/16 GB for 10,000 concurrent
signed-in users) are planning estimates. Verify them with the load test on your hardware.

## Project layout

```
prisma/            schema.prisma, seed.ts
src/lib/           db, auth (sessions), rbac, conflicts, session-config
src/middleware.ts  session verification + sliding renewal
src/app/actions/   server actions (all writes): auth, timetable, exams, attendance, admin, people, academic
src/app/           pages: login, dashboard, timetable(+edit), exams(+edit), attendance, my, admin,
                   academic, people, reports, audit, api/{health,keepalive,logout}
src/components/    Nav, ScheduleActions, IdleTimer, SwRegister
public/            manifest, icon, minimal service worker (caches nothing)
scripts/, loadtest/  load-test tooling
Dockerfile, docker-compose.yml, nginx.conf
```

## Known limitations / next steps

- No automated tests, password reset, forced password change, or login lockout yet.
- Conflict checks are check-then-write; add DB exclusion constraints for strict guarantees.
- Exams are not cross-checked against weekly classes; no holiday calendar.
- Dates are handled as UTC; set the university's time zone before real use.
- The user cache means revoked accounts can stay active up to 30 s on other replicas (Redis would fix this).
- Add CSP, a CDN for static assets, monitoring, backups and HTTPS before production.
