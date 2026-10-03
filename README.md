# AI-Powered Interview Preparation Platform

MERN-stack platform for interview preparation: onboarding-driven student
profiles, admin-managed training programs (Aptitude/GD/Technical/HR), a
Gemini AI layer for recommendations/mock-interviews/content-assist/resume
polishing, and an auto-generated resume once required trainings are passed.

See `plan.md` for the full architecture, data model, API surface, and phased
build roadmap.

## Prerequisites

- Node.js 18+
- MongoDB and Redis running locally. Easiest path: install
  [Docker Desktop](https://www.docker.com/products/docker-desktop/) and run:
  ```
  docker compose up -d
  ```
  This starts Mongo on `27017` and Redis on `6379` (see `docker-compose.yml`).
  Without Docker, install MongoDB Community Server and a local Redis build
  (e.g. Memurai on Windows) and update `server/.env` accordingly.

## Backend (`server/`)

```
cd server
npm install             # also downloads a bundled Chromium (~400MB) for Puppeteer/resume PDFs
cp .env.example .env   # then fill in GEMINI_API_KEY and JWT secrets
npm run dev            # API on http://localhost:5000
npm run worker         # background job worker (separate process)
npm run seed            # WIPES and repopulates the DB with realistic demo data (see below)
npm run seed:admin      # creates one admin account, deletes nothing
npm test                # Jest + Supertest
npm run load-test       # manual autocannon smoke check against a running instance
```

### Demo data (`npm run seed`)

Populates one admin, 8 students (6 onboarded with AI profile summaries, 2 not
— to demo the onboarding wizard), 8 training programs across all 4 round
types (6 published, 2 draft) with all 4 module types each, 12 enrollments
spanning passed/failed/in-progress states, 3 pending GD submissions in the
admin review queue, 6 grooming articles, and AI-usage history for the admin
dashboard. All accounts use password `Password123!` — the script prints the
full list of logins when it finishes. It's destructive (wipes the relevant
collections first) and refuses to run with `NODE_ENV=production`.

### Admin account only (`npm run seed:admin`)

Creates a single admin and touches nothing else, so it's safe on a real
database (including production). Credentials come from environment
variables so the password never lands in shell history:

```bash
ADMIN_EMAIL=placement.cell@college.edu ADMIN_PASSWORD='a long passphrase' npm run seed:admin
```

On Windows PowerShell:

```powershell
$env:ADMIN_EMAIL='placement.cell@college.edu'; $env:ADMIN_PASSWORD='a long passphrase'; npm run seed:admin
Remove-Item Env:ADMIN_PASSWORD
```

The password must be at least 12 characters and not an obvious one.
Running it again for an existing admin changes nothing unless you pass
`--reset-password` (sets the new password and signs out all of that
account's sessions). If the email belongs to a student, it refuses unless
you pass `--promote`.

## Frontend (`client/`)

```
cd client
npm install
npm run dev             # http://localhost:5173, proxies /api to :5000
npm test                 # Vitest + React Testing Library
```
