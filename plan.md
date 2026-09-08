# AI-Powered Interview Preparation Platform — Comprehensive Plan

## Context

The goal is a MERN-stack platform where students prepare for job interviews through
admin-curated training programs (Aptitude, GD, Technical, HR rounds), guided by an
AI (Gemini) layer that personalizes recommendations, generates/assists content,
runs mock interviews, gives performance feedback, and ultimately produces an
auto-generated resume once a student clears the required trainings.

The working directory is currently empty — this is a from-scratch build, not a
retrofit. The user has explicitly prioritized three things above raw feature
velocity: **no insecure code**, **QA on every function after it's built**, and
**performance/optimization** (the app must stay responsive with many concurrent
students). The plan below is organized so those three properties are enforced
*per phase*, not bolted on at the end.

Requirements were narrowed down via clarifying questions:
- Training content spans **all four formats**: reading material+quiz, MCQ/quiz,
  AI-driven mock interview (Gemini asks questions, evaluates free-text answers),
  and GD/video submission (manual or AI-assisted review).
- Auth: JWT access token + httpOnly-cookie refresh token, with rotation.
- File storage: **local disk** (student's explicit choice over cloud storage).
- Scale target: "small production scale" (hundreds–low thousands of users) —
  meaning Redis caching and a background job queue are justified, not overkill.
- Single admin role (no moderator tier).
- Gemini is used in **five places**: profile summarization → training
  recommendation, AI mock interview Q&A + evaluation, admin content-generation
  assist, resume content polishing, and post-training performance tips.
- Resume: server-rendered HTML → PDF (Puppeteer), downloadable only by the
  owning student.
- Deployment: local/dev only for now; architecture shouldn't preclude deploying
  later.

## Recommended Improvements to the Original Idea

These are refinements/additions worth folding in — flagged **(core)** where they
close a gap in the original idea, or **(optional/backlog)** where they're valuable
but can be deferred past the initial build without weakening the core product:

- **(core)** Separate the *rollup* of a student's progress (`Enrollment`) from
  the *per-module* progress (`ModuleProgress`) and from the *raw attempt data*
  (`Submission`). Your original description implied one blob of "evaluation" per
  student; splitting it avoids write contention and keeps every read fast at scale
  (detailed in the Data Model section).
- **(core)** Treat every Gemini call as **fire-and-forget from the student's
  perspective** — queued as a background job, polled by the frontend — rather
  than making the student's HTTP request wait on an external API. This is what
  keeps the app "seamless" under concurrent load, since Gemini latency (1-5s+)
  would otherwise directly stall request threads.
- **(core)** Deterministic **fallback behavior** for every AI call (e.g. rule-based
  profile summary if Gemini fails, "manual review required" if AI interview
  evaluation fails). Without this, a Gemini outage or rate-limit would brick core
  flows like onboarding or resume generation.
- **(core)** An `AiInteractionLog` collection — lightweight audit trail of every
  Gemini call (operation, status, latency, token count) with a 90-day TTL index.
  Needed for both cost visibility (you're paying per token) and debugging "why did
  the AI say that."
- **(optional/backlog)** Admin analytics dashboard beyond basic stats: cohort pass
  rates by round type, average time-to-pass, most-failed quiz questions (helps
  admin improve content quality over time).
- **(optional/backlog)** Lightweight gamification: streaks, badges for completed
  tracks, a leaderboard — meaningfully increases engagement for this kind of
  platform but isn't needed for a functioning MVP.
- **(optional/backlog)** Email notifications (training assigned, GD review
  completed, resume ready) — valuable but adds an email-service dependency;
  defer until the core loop works.
- **(optional/backlog)** Multiple resume templates (compact/detailed/ATS-friendly)
  instead of one fixed template.
- **(optional/backlog)** Admin bulk-import of quiz questions via CSV/JSON upload,
  useful once question banks grow large.

Everything else below assumes the **core** items are in scope; optional items are
called out again in the phased roadmap as natural post-MVP additions, not part of
Phases 0–7.

## Tech Stack

- **Frontend**: React (Vite), Redux Toolkit + RTK Query, feature-folder structure,
  Tailwind CSS for styling (default choice — swap is trivial if you prefer MUI).
- **Backend**: Node.js + Express, layered architecture (config / models /
  repositories / services / controllers / routes / middlewares / validators /
  prompts / jobs).
- **Database**: MongoDB + Mongoose.
- **Cache & queue**: Redis + BullMQ (async AI jobs, PDF generation).
- **AI**: Google Gemini via `@google/generative-ai`, centralized in one service.
- **File storage**: local disk via `multer`, served through authenticated routes
  (never Express `static` for user-uploaded content).
- **PDF**: Puppeteer (HTML template → PDF), rendered inside a background worker.
- **Testing**: Jest + Supertest (backend), React Testing Library (frontend),
  `mongodb-memory-server` for integration tests, `autocannon`/`k6` for load tests.
- **Security middleware**: `helmet`, `cors`, `express-rate-limit`,
  `express-mongo-sanitize`, `sanitize-html`, `zod` validation, `bcrypt`.

## Architecture Overview

```
React (Vite) client  ──HTTP/JSON──▶  Express API  ──▶  MongoDB
      │  (Bearer access token,           │   │
      │   httpOnly refresh cookie)       │   └─▶  Redis (cache + rate-limit counters)
      │                                  │
      └── polls job status ◀─────────────┘
                                          │
                                    BullMQ Queues ──▶ Workers ──▶ Gemini API
                                                          │
                                                          └─▶ Puppeteer (resume PDF)
                                                          └─▶ local disk (storage/)
```

Controllers stay thin (parse request → call service → shape response). Services
hold business logic and are the only callers of repositories and `aiService`.
Repositories are the only code that touches Mongoose models directly — this is
what keeps services unit-testable (mock the repository, not the DB) and keeps
data-access patterns consistent/reusable across the codebase.

## Data Model Summary

| Collection | Purpose | Key relationships |
|---|---|---|
| `User` | Auth identity, role (`student`/`admin`), refresh-token rotation state | — |
| `Profile` | Editable student profile, onboarding answers, AI summary, rule-based defaults | 1:1 → `User` |
| `TrainingProgram` | Admin-managed program metadata, round type, pass criteria, ordered module manifest | `createdBy` → `User`; `moduleOrder[]` → `Module` |
| `Module` (discriminated) | One of `material` / `quiz` / `ai_interview` / `gd_submission`, single collection with a `type` discriminator | → `TrainingProgram` |
| `Enrollment` | Rollup: student × program, aggregate score/status | → `User`, → `TrainingProgram` |
| `ModuleProgress` | Per student × module completion state (kept separate from `Enrollment` to avoid write contention as students progress concurrently) | → `Enrollment`, → `Module` |
| `Submission` | The actual attempt payload (quiz answers / interview Q&A+evaluation / GD text-or-file+review) | → `Module`, → `Enrollment` |
| `GroomingContent` | Admin-managed grooming/soft-skills articles | — |
| `Resume` | Generated resume state, AI-polished content, PDF path | 1:1 → `User` (versioned) |
| `AiInteractionLog` | Audit trail of every Gemini call, TTL 90d | → `User` |

Design rules applied: reference (not embed) anything that grows unbounded or is
written independently of its parent (submissions, progress records); embed only
small, always-together, rarely-independently-written data (profile's skill
arrays, a program's module *order*). Full field-level schemas are ready to write
directly into `server/src/models/*.js` once implementation starts.

## API Surface (grouped)

- **`/api/v1/auth`** — register, login, refresh (rotation), logout, logout-all, me
- **`/api/v1/onboarding`** — get questionnaire, submit (creates profile + queues AI
  summarization), poll status
- **`/api/v1/profile`** — get/edit own profile, avatar upload, on-demand AI-summary
  refresh, admin view of any profile
- **`/api/v1/trainings`** — CRUD (admin), publish toggle, module reorder, catalog
  browse (student sees published-only, cached)
- **`/api/v1/trainings/:id/modules`** — CRUD per module type (admin), AI content
  draft request (admin), mark-read (student)
- **`/api/v1/enrollments`** — enroll, list own progress, admin roster view
- **`/api/v1/submissions`** — quiz submit (sync auto-grade), AI-interview
  start/answer/poll-result (async), GD submit/review/AI-assist-review, fetch
  performance tips
- **`/api/v1/grooming`** — CRUD (admin), AI draft, student browse, personalized
  tip (cached)
- **`/api/v1/resume`** — eligibility check, generate (async), status poll,
  download (ownership-scoped, streamed)
- **`/api/v1/admin`** — student list/progress, dashboard stats, AI usage summary

Every mutating admin route requires `requireRole('admin')`; every
student-resource route requires an explicit ownership check (never trust an
ObjectId in the URL alone).

## AI Integration Layer

A single `server/src/services/aiService.js` is the **only** code that talks to
Gemini. It exposes one function per touchpoint (`summarizeProfile`,
`recommendTrainings`, `generateMockInterviewQuestions`, `evaluateInterviewAnswer`,
`generateContentDraft`, `polishResumeContent`, `generatePerformanceTips`,
`generatePersonalizedGroomingTip`). Each function:

1. Builds a prompt from a **versioned template** in `server/src/prompts/<op>/v1.js`
   (every persisted AI output stores its `promptVersion` for auditability).
2. Calls a thin `geminiClient` wrapper with retry/backoff on transient errors
   only (not on 4xx), and a hard per-call timeout.
3. Validates the response against a `zod` schema.
4. On failure/rate-limit, returns a **deterministic fallback** and logs to
   `AiInteractionLog` — no student- or admin-facing flow ever hard-fails because
   Gemini is unavailable.

**Async by default**: every Gemini-calling operation runs as a BullMQ job
(separate queues per concern — `ai-profile`, `ai-interview`, `ai-content`,
`ai-resume`, `ai-tips` — so a burst of heavy resume/PDF jobs can't starve
latency-sensitive interview-question jobs). The one deliberate exception: quiz
grading is synchronous because it's pure computation with no external call.

**Caching (Redis)**: training-catalog listings, personalized grooming tips, and
training recommendations are cached with short TTLs. Interview questions and
evaluation results are **never** cached (must be fresh per attempt, and
correctness matters more than latency there).

## Resume Generation Pipeline

`POST /resume/generate` re-validates eligibility server-side, enqueues a job, and
returns immediately (`202`). The worker: aggregates profile + passed-training
highlights → calls `polishResumeContent` (falls back to a rule-based bullet
formatter on AI failure) → renders an EJS resume template → converts to PDF via
Puppeteer (run inside the worker process so a Chromium crash can't take down the
API) → saves to `storage/resumes/<userId>/...` → marks `Resume.status = 'ready'`.
`GET /resume/download` is a controller (not a static file route) that loads the
resume scoped strictly to `req.user.id` and 404s for any other student —
enforcing "downloadable by the student only" at the code level, not just the UI.

## Security Measures (baseline, enforced from Phase 0 onward)

- `helmet`, `cors` (explicit allowlist, `credentials: true`), global +
  route-specific rate limiting (auth routes stricter; AI-triggering routes
  limited per-user via Redis, independent of the IP-based limiter).
- `express-mongo-sanitize` against NoSQL injection; `zod` schemas (`.strict()`)
  on every route input; `sanitize-html` on any admin-authored rich text that
  renders back to students (material body, grooming articles).
- JWT access token (short-lived, returned in body, kept in memory on the
  frontend — not localStorage) + refresh token in an httpOnly/Secure/SameSite
  cookie, with **rotation and reuse detection** (a replayed old refresh token
  invalidates the whole session family).
- `bcrypt` password hashing; `passwordHash` and refresh-token fields marked
  `select:false` on the `User` model so they never leak via default queries.
- File uploads: `multer` with a `fileFilter` allowlist **and** server-side
  content-type verification (client-supplied mimetype is spoofable), stored
  outside any public/static root, served only through an authenticated route.
- Centralized error handler: generic message + no stack trace when
  `NODE_ENV=production`; structured logging (`pino`) with redaction of
  passwords, tokens, and cookies.
- Secrets via `.env` (`GEMINI_API_KEY`, JWT secrets, `MONGO_URI`, `REDIS_URL`),
  `.env.example` committed, `.env` gitignored.

## Folder Structure

**Backend** (`server/src/`): `config/`, `models/` (+ `models/modules/` for the
four discriminators), `repositories/`, `services/`, `controllers/`, `routes/`,
`middlewares/`, `validators/`, `prompts/`, `jobs/` (+ `jobs/workers/`),
`templates/resume/`, `utils/`. Local uploads live in a gitignored `server/storage/`
(not under `src/`, not web-served directly). Tests live in `server/tests/`,
split into `unit/`, `integration/`, `security/`, `load/`.

**Frontend** (`client/src/`): `app/` (Redux store), `routes/` (`ProtectedRoute`,
`RoleRoute`), `features/<domain>/` (auth, onboarding, profile, trainings,
admin, grooming, resume — each with its slice, RTK Query API, and page
components), `components/common/` and `components/layout/`, `lib/apiClient.js`
(axios instance with token-refresh interceptor).

This is a repeating pattern (one folder per domain, same internal shape) —
representative paths: `server/src/services/resumeService.js`,
`server/src/models/modules/QuizModule.js`,
`client/src/features/trainings/modules/AiInterviewModuleView.jsx`.

## Testing & QA Strategy

Every phase below ships its tests before moving to the next — QA is not a final
pass:

- **Unit** (Jest): pure utils (score calculator) and services with repositories
  + `aiService` mocked — including asserting the fallback path when Gemini
  errors or rate-limits.
- **Integration** (Jest + Supertest + `mongodb-memory-server`): full HTTP routes
  per resource, covering both the happy path and RBAC/ownership rejections.
- **Security** (adversarial Supertest suite): RBAC bypass attempts (student
  hitting admin routes, hitting another student's resume/submission by
  guessed ObjectId), NoSQL-injection payloads in auth/body fields, XSS payloads
  in rich-text fields verifying sanitization.
- **Load** (manual, not per-commit): `autocannon` quick smoke on auth/catalog
  endpoints, a `k6` multi-step scenario (login → browse → submit) targeting a
  concrete concurrency number appropriate to "small production scale."
- **Frontend**: React Testing Library for auth/onboarding/route-guard flows.

## Phased Build Roadmap

Each phase has explicit exit criteria — a phase isn't "done" until its tests
pass and the flow works end-to-end manually.

1. **Phase 0 — Scaffolding & infra**: project init (client+server), env config,
   Mongo/Redis connections, BullMQ bootstrap, security middleware baseline,
   error handling. *Exit: `/health` returns 200, a trivial test passes on both
   sides, Vite app boots.*
2. **Phase 1 — Auth + onboarding + profile**: register/login/refresh-rotation,
   RBAC middleware, onboarding submit → rule-based profile + async AI summary,
   profile view/edit. *Exit: full register→onboard→profile flow works E2E;
   auth + RBAC + reuse-detection tests pass.*
3. **Phase 2 — Admin + training catalog**: `TrainingProgram`/`Module` (all 4
   types) CRUD, publish toggle, admin AI content-draft, cached student catalog
   browse. *Exit: admin builds a full program with all module types; student
   sees only published ones; CRUD+RBAC tests pass.*
4. **Phase 3 — Student training experience**: enrollment, `ModuleProgress`,
   `Submission`, sync quiz grading, async AI-interview question-gen +
   evaluation, GD submission + admin review queue + AI-assist. *Exit: a
   student completes one full program across all 4 module types and the
   enrollment resolves to passed/failed per `passCriteria`.*
5. **Phase 4 — Grooming section**: CRUD, AI draft, student browse, cached
   personalized tips. *Exit: publish → browse → personalized tip (verified
   cached on repeat request).*
6. **Phase 5 — Evaluation aggregation + performance tips**: wire
   `generatePerformanceTips` to fire after every grading event; confirm
   `AiInteractionLog` is populated across all AI touchpoints so far. *Exit:
   completing any module produces a retrievable performance tip; admin
   AI-usage view shows real data.*
7. **Phase 6 — Resume generation**: eligibility check, async
   aggregate→AI-polish→render→PDF pipeline, ownership-scoped download. *Exit:
   eligible student downloads a real PDF; another student gets 404 on it;
   fallback path tested by forcing a simulated Gemini failure.*
8. **Phase 7 — Cross-cutting hardening pass**: re-audit every route added so
   far against the security checklist, run load tests, verify log redaction
   and production error responses, `npm audit`. *Exit: security test suite
   green, load test produces acceptable latency at target concurrency, no
   open checklist items.*

Optional/backlog items (analytics dashboard, gamification, email notifications,
multi-template resumes, CSV question import) slot in naturally after Phase 7,
each as its own small addition rather than expanding the core phases.

## Verification

After each phase: run `npm test` (unit+integration) in `server/`, run the
frontend test suite in `client/`, and manually walk the phase's core flow in the
browser (register→login for Phase 1, full training completion for Phase 3,
etc.). After Phase 7, additionally run the `autocannon`/`k6` load scripts and
the `security/` suite as a final gate before considering the MVP feature-complete.
