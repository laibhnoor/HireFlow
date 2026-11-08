# HireFlow

Evidence-backed job application copilot. Upload a CV, paste a job description,
and see exactly how well you match — requirement by requirement, with the line
in your CV that proves it. Then generate the materials that close the gap.

## Status

Phases 1 (foundation), 2 (CV ingestion) and 3 (job matching) are complete:

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
- Offline deterministic pipeline for extraction, retrieval and verdicts when no
  OpenAI key is configured

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

# 5. Run
npm run dev
```

Open <http://localhost:3000>, create an account, and you'll land in the
workspace.

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
    api/cv/            authenticated CV upload and download routes
  components/
    app/               shell, nav, page chrome
    applications/      analyzer form, score chip, status badge
    auth/              forms
    cv/                uploader, status badge, delete controls
    ui/                primitives
  lib/
    ai/                OpenAI client, JSON-mode chat, embeddings + mock fallback
    auth-guards.ts     server-side session guard
    cv/                validation, extraction, section parsing, chunking, ingest
    db.ts              Prisma singleton
    env.ts             validated environment
    jobs/              extraction, retrieval, classification, orchestration
    scoring.ts         rubric v1.0, dimensions and weighted scoring
    text.ts            shared tokenizer and text helpers
prisma/
  schema.prisma        full data model
  migrations/          includes CREATE EXTENSION vector
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

### Uploads

Original CV files are stored as `bytea` in `Cv.fileBytes` (10 MB cap) and served
only through an ownership-checked route. Nothing is written to public storage.
Deleting a CV cascades to chunks, analyses and generated documents.

## Scripts

```bash
npm run dev          # dev server
npm run build        # production build
npm run start        # serve the build
npm run typecheck    # tsc --noEmit
npm run db:migrate   # prisma migrate dev
npm run db:studio    # Prisma Studio
npm run db:generate  # regenerate the client
npm run test         # vitest (watch)
```

## Roadmap

1. **Foundation** — scaffold, schema, auth, design system ✅
2. **CV ingestion** — upload, parsing, chunking, embeddings, library UI ✅
3. **Job matching** — requirement extraction, pgvector retrieval,
   evidence-backed scoring UI, application views ✅
4. Streamed cover letters and CV improvement suggestions
5. Skill-gap roadmap and interview preparation
6. Application tracker (list, kanban, timeline), dashboard metrics, seed data,
   tests and deployment notes
