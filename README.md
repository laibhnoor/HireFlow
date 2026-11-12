# HireFlow

Evidence-backed job application copilot. Upload a CV, paste a job description,
and see exactly how well you match — requirement by requirement, with the line
in your CV that proves it. Then generate the materials that close the gap.

## Status

Phases 1 (foundation), 2 (CV ingestion), 3 (job matching), 4 (generated
materials), 5 (roadmap and interview prep), 6 (tracker and dashboard) and 7
(hardening and AI quality) are complete:

- Next.js 16 App Router, TypeScript, Tailwind v4, hand-rolled shadcn-style UI
- Credentials auth (email + password, bcrypt, Auth.js JWT sessions)
- Postgres 16 + pgvector via Docker, full Prisma data model, initial migration
- Marketing page, auth pages, protected workspace shell, dashboard, settings
- CV upload (PDF/DOCX/TXT/MD, 10 MB), text extraction, section parsing,
  section-aware chunking, embeddings with deterministic offline fallback
- CV library and detail views: parsed sections, indexed passages, download,
  set-primary and delete flows
- Job analysis: LLM/heuristic requirement extraction, pgvector cosine retrieval,
  per-requirement verdicts with cited evidence, rubric score, and application
  list/detail/dashboard views
- Streamed cover letters and CV improvement suggestions with tone, length and
  focus controls, version history, copy/download and evidence-only guardrails
- Skill-gap roadmap (4- or 12-week horizon) and interview preparation with
  evidence-based STAR outlines, honest gap scripts and follow-up questions
- Application tracker with list, kanban-style board and timeline views, plus
  optimistic status changes that write a real event history
- Dashboard metrics (average match, active applications, interviews, offers,
  response rate), pipeline breakdown, recent applications and recent activity
- Idempotent demo seed with a sample CV, six applications across every stage and
  four pre-generated documents
- Offline deterministic pipeline for extraction, retrieval, verdicts and
  generated materials when no OpenAI key is configured
- Daily per-account quotas for analyses, generated materials and CV uploads,
  with a usage card in settings
- Best-effort login throttling and material-generation burst limits
- Structured interview question bank persisted alongside each interview-prep
  document
- Extraction and classification evaluation tests, including the citation
  guardrail
- Accessibility and security hardening: skip link, landmarks, reduced motion,
  and hardened response headers

## Quick start

Requirements: Node 20.9+, Docker, npm.

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env        # Windows: Copy-Item .env.example .env
# then set POSTGRES_PASSWORD, DATABASE_URL and AUTH_SECRET

# 3. Start Postgres (pgvector image, host port 5433)
docker compose up -d

# 4. Apply the schema
npx prisma migrate dev

# 5. Optional: load the demo account
npm run db:seed

# 6. Run
npm run dev
```

Open <http://localhost:3000>, create an account, or sign in with the seeded
demo account:

| Email | Password |
| --- | --- |
| `demo@hireflow.app` | `demo12345` |

The seed is idempotent: it resets the demo account's applications, CVs and logs
but keeps the same `User` row, so an active demo session stays valid. It forces
offline mode before importing the app, so seeding never spends OpenAI credits.

Generate a session secret with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### Environment

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Postgres connection string (host port 5433 by default) |
| `AUTH_SECRET` | Auth.js JWT signing key |
| `AUTH_URL` | Base URL, `http://localhost:3000` in dev |
| `OPENAI_API_KEY` | Optional. Empty means deterministic demo mode |
| `OPENAI_BASE_URL` | OpenAI-compatible endpoint |
| `OPENAI_CHAT_MODEL` | Default `gpt-4o-mini` |
| `OPENAI_EMBEDDING_MODEL` | Default `text-embedding-3-small` (1536 dims) |
| `POSTGRES_PASSWORD` | Consumed by `docker-compose.yml` |

## Architecture

```
src/
  app/
    (auth)/            login, signup, server actions
    (app)/             workspace shell (dashboard, cv, applications, settings)
    api/auth/          Auth.js route handler
    api/applications/  SSE material generation route
    api/cv/            authenticated CV upload and download routes
  components/
    app/               shell, nav, stat cards, page chrome
    applications/      analyzer form, score chip, status badge/select, material generator
    auth/              forms
    cv/                uploader, status badge, delete controls
    ui/                primitives
  lib/
    ai/                OpenAI client, JSON-mode chat, streaming chat, embeddings
    applications/      statuses, labels, variants and board columns
    auth-guards.ts     server-side session guard
    cv/                validation, extraction, section parsing, chunking, ingest
    db.ts              Prisma singleton
    env.ts             validated environment
    generation/        context, prompts, mock writer, streaming orchestration,
                       interview question parser
    jobs/              extraction, retrieval, classification, orchestration
    rate-limit.ts      best-effort in-process burst and login limiters
    scoring.ts         rubric v1.0, dimensions and weighted scoring
    text.ts            shared tokenizer and text helpers
    tracker.ts         board grouping, metrics and timeline helpers
    usage.ts           daily database-backed quotas
prisma/
  schema.prisma        full data model
  migrations/          includes CREATE EXTENSION vector
  seed.ts              idempotent demo data
```

### The score is computed, not guessed

The LLM extracts job requirements and classifies each one against retrieved CV
evidence. Application code then applies a published rubric:

| Dimension | Weight |
| --- | --- |
| Must-have skills | 40 |
| Relevant experience | 25 |
| Education & certifications | 15 |
| Projects & portfolio | 10 |
| Seniority & ATS keywords | 10 |

Every `Analysis` stores its `rubricVersion`, the per-requirement verdicts and the
evidence chunk references, so a score can always be explained and reproduced.
Generation prompts reuse the same evidence set, which keeps the cover letter,
CV suggestions, roadmap and interview prep consistent with the analysis.

#### Verdicts and weights

- Each requirement gets `MATCHED` (1 point), `PARTIAL` (0.5) or `MISSING` (0).
- `MUST_HAVE` requirements weigh 2, `NICE_TO_HAVE` weigh 1.
- A dimension with no requirements is marked inapplicable and its weight is
  redistributed proportionally across the remaining dimensions, so a role that
  asks for no education does not silently lose 15 points.
- A non-missing verdict must cite at least one real `CvChunk`. If the model
  cites an unknown chunk, that verdict is downgraded to `MISSING`.

### RAG pipeline (complete)

1. Parse CV (PDF/DOCX/text) into section-aware chunks. ✅
2. Embed chunks with `text-embedding-3-small`, store in `CvChunk.embedding`
   (`vector(1536)`). ✅ (deterministic hashing embeddings when no API key)
3. Extract job requirements into must-have / nice-to-have. ✅
4. Retrieve top-k chunks per requirement with cosine similarity. ✅
5. Classify each requirement against retrieved evidence only, returning chunk
   IDs; unknown citations are dropped. ✅
6. Score in TypeScript, then persist the job, application, analysis and
   requirement matches in one transaction. ✅

HNSW indexing is intentionally deferred; per-CV chunk counts are small enough
for exact cosine search. Add an index when chunk volume grows.

### Generated materials

The application detail tabs generate from the stored analysis only. There are
four document types:

| Type | What it produces | Options |
| --- | --- | --- |
| Cover letter | A send-ready letter in plain text | Tone, length, emphasis, personal note |
| CV suggestions | Requirement-by-requirement edits and draft bullets | None |
| Skill-gap roadmap | Phased learning and evidence-building plan | 4-week or 12-week horizon |
| Interview prep | Likely questions, STAR outlines and gap scripts | Balanced, technical or behavioural focus |

`loadMaterialContext` loads the job, rubric result and each requirement's cited
CV snippets; missing requirements are passed as goals, never as candidate
experience.

```
POST /api/applications/[id]/materials
  -> text/event-stream
     event: delta  { text }
     event: done   { docId, version, model, promptVersion, inputTokens, outputTokens }
     event: error  { message }
```

- The route is a streaming `Response`, not a server action, so tokens arrive
  while the document is written.
- A document is persisted only after the stream completes successfully. Stopping
  the stream or a provider failure saves nothing and reports the error in the UI.
- Every completed run inserts a new `GeneratedDoc` with the next `version` for
  that application and type, plus the model, prompt version and token counts.
  Usage logs and an `ApplicationEvent` are written alongside it.
- Cover letters accept tone, length, emphasis and a candidate-supplied note. CV
  suggestions cover every partial and missing requirement, prioritise
  must-haves, and only draft a bullet from evidence the candidate already has.
- Roadmaps sequence missing must-haves first, then partial must-haves, then
  nice-to-haves. Each step names an observable "done when" and the evidence to
  produce; missing requirements never become claims.
- Interview prep converts matched and partial evidence into STAR outlines, moves
  missing requirements into honest gap scripts, and adds realistic follow-ups.
- The version selector switches between saved documents without regenerating.
- With no `OPENAI_API_KEY`, a deterministic writer produces the same
  evidence-only shape so the full flow works offline.

### Application tracker

`/applications?view=list|board|timeline` renders the same data three ways:

- **List** — one row per application with its score, status and an inline status
  selector.
- **Board** — columns `Saved`, `Applied`, `Screening`, `Interview`, `Offer` and
  `Closed`. `Rejected` and `Withdrawn` share the Closed column so the pipeline
  stays readable; the badge and selector still show the exact status.
- **Timeline** — the last 120 `ApplicationEvent` rows grouped by UTC day.

Status changes go through `updateApplicationStatusAction`. It validates the
new status, checks ownership, sets `appliedAt` the first time an application
leaves `Saved`, and writes a `STATUS_CHANGED` event such as
`Applied → Screening` in the same transaction. The client selector updates
optimistically and rolls back on failure.

Other events are written by the features that cause them:
`ANALYSIS_COMPLETED` when scoring finishes and `MATERIAL_GENERATED` when a
document version is saved.

Dashboard metrics are computed from the same records in `src/lib/tracker.ts`:

| Metric | Definition |
| --- | --- |
| Average match | Mean `overallScore` across scored applications |
| Active | Status in `Saved`, `Applied`, `Screening`, `Interview`, `Offer` |
| Interviews | Applications currently at `Interview` |
| Offers | Applications currently at `Offer` |
| Response rate | Applications at `Screening`, `Interview`, `Offer` or `Rejected`, divided by applications with `appliedAt` set or a status other than `Saved` |

### Uploads

Original CV files are stored as `bytea` in `Cv.fileBytes` (10 MB cap) and served
only through an ownership-checked route. Nothing is written to public storage.
Deleting a CV cascades to chunks, analyses and generated documents.

### Cost controls and rate limits

Quotas are per user and reset at midnight UTC. They are counted from persisted
rows (`UsageLog` for AI calls, `Cv.createdAt` for uploads), so they survive
restarts and work across instances:

| Action | Daily limit | Counted from |
| --- | --- | --- |
| Job analysis | 20 | `UsageLog(kind = job_analysis)` |
| Generated material | 40 | `UsageLog(kind = material_*)` |
| CV upload | 10 | `Cv.createdAt` |

When a limit is reached the action is rejected with a `429` (or an inline form
error) that names the reset time. Settings shows the same numbers as progress
bars. In-process limiters add two best-effort protections on top:

- Sign-in failures: 8 per email per 15 minutes.
- Material generation: 6 requests per user per minute.

These limiters hold state in memory, so on serverless or multi-instance hosts
each instance has its own window. The database quotas remain the durable cost
control; move the burst windows to Redis if strict global limits are needed.
The materials route also rejects bodies over 16 KB before parsing.

### Interview question bank

When an interview-prep document is saved, `parseInterviewQuestions` extracts the
"Likely questions" section into `InterviewQuestion` rows: category, question,
STAR hint, evidence prompt and follow-up. Rows are replaced per application on
each new version, so the bank always matches the latest document. Parsing is
best-effort and never rolls back a completed generation.

### Quality tests

`npm run test:run` includes deterministic evaluation fixtures for the offline
pipeline:

- Extraction keeps must-have and nice-to-have sections separate, ignores company
  intros and benefits, splits single-paragraph postings and accepts unheaded
  bullet lists.
- Classification marks direct keyword coverage as `MATCHED`, partial coverage as
  `PARTIAL`, and unrelated passages as `MISSING`; a high similarity score alone
  never creates a citation.
- Every non-missing verdict is asserted to cite a chunk that was actually
  supplied for that requirement.
- Rubric weights, quota windows, rate-limiter behaviour, tracker metrics and the
  interview markdown parser each have focused unit tests.

### Security and accessibility

- All responses set `Content-Security-Policy`, `X-Content-Type-Options`,
  `X-Frame-Options`, `Referrer-Policy` and a restrictive `Permissions-Policy`;
  production also sets HSTS. The CSP allows Next.js inline bootstrap scripts and
  should be tightened with a nonce if third-party scripts are introduced.
- The workspace, auth and marketing layouts expose a single `<main id="main">`
  landmark and a keyboard-accessible "Skip to content" link.
- Streaming states use `aria-busy` and polite live regions.
- `prefers-reduced-motion` disables smooth scrolling, animations and transitions.

## Scripts

```bash
npm run dev          # dev server
npm run build        # production build
npm run start        # serve the build
npm run typecheck    # tsc --noEmit
npm run db:migrate   # prisma migrate dev
npm run db:studio    # Prisma Studio
npm run db:generate  # regenerate the client
npm run db:seed      # reset and load the demo account
npm run test         # vitest (watch)
npm run test:run     # vitest once
```

## Deployment

The app is a single Next.js service plus Postgres with the `vector` extension.

1. Provision Postgres 16 with pgvector (`pgvector/pgvector:pg16` or managed
   equivalent) and set `DATABASE_URL`.
2. Set `AUTH_SECRET` (32 random bytes) and `AUTH_URL` to the public origin.
3. Apply committed migrations in production — never `migrate dev`:

   ```bash
   npx prisma migrate deploy
   ```

4. Build and run:

   ```bash
   npm ci
   npm run build
   npm run start
   ```

5. Add `OPENAI_API_KEY` for model-quality output. Without it the app runs in
   deterministic demo mode; ingestion, scoring, generation and the tracker all
   work offline.
6. Optionally run `npm run db:seed` for a demo account. Seeding forces offline
   mode and only resets `demo@hireflow.app`.

Operational notes:

- CV bytes live in Postgres, so there is no separate object store or shared
  filesystem to back up. Back up the database and you have everything.
- The SSE materials route needs response buffering disabled at the proxy and a
  read timeout longer than a generation run (allow at least 60 seconds).
- `CvChunk.embedding` is `vector(1536)`. Changing `OPENAI_EMBEDDING_MODEL` to a
  different dimension requires a new column and re-indexing.
- Exact cosine search is used today. Add an HNSW index when chunk volume makes
  sequential scans noticeable.
- The in-process login and burst limiters are per instance. Use a shared store
  before running multiple instances behind a load balancer.
- Terminate TLS at the proxy so the production HSTS header is effective.

## Roadmap

1. **Foundation** — scaffold, schema, auth, design system ✅
2. **CV ingestion** — upload, parsing, chunking, embeddings, library UI ✅
3. **Job matching** — requirement extraction, pgvector retrieval,
   evidence-backed scoring UI, application views ✅
4. **Generated materials** — streamed, versioned cover letters and CV
   suggestions with evidence guardrails ✅
5. **Roadmap and interview prep** — phased gap plan, STAR outlines and honest
   gap scripts ✅
6. **Tracker and dashboard** — list, kanban and timeline views, status event
   history, dashboard metrics, demo seed, tests and deployment notes ✅
7. **Hardening and AI quality** — daily quotas, best-effort rate limits,
   interview question persistence, extraction/classification evaluation tests,
   accessibility and security headers ✅
