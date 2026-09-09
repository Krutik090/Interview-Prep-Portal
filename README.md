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
npm test                # Jest + Supertest
```

## Frontend (`client/`)

```
cd client
npm install
npm run dev             # http://localhost:5173, proxies /api to :5000
npm test                 # Vitest + React Testing Library
```
