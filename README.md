# L'Oréal Claims Intelligence Engine

AI-assisted substantiation of cosmetic product claims against clinical study evidence.
A Paris R&I scientist submits a proposed formula supporting a claim (e.g. *"Reduces wrinkles by 20% in 4 weeks"*), an evaluator attaches the results of a clinical study, and an LLM assesses whether the study actually justifies the claim. The verdict is persisted and returned to the React UI.

## Business Flow

```
Business team proposes claim        →  Claim Manager filters (applicability / feasibility)
  →  Scientist: formulation test    →  Evaluator: attaches clinical study
  →  LLM: does the study justify the claim?  →  Verdict persisted + returned to UI
```

This repo implements the **focused core** with two strictly separated responsibilities: the **Scientist** submits product + claim + formula (`POST /api/claims`), the **Evaluator** later attaches clinical study evidence to an *existing* claim (`POST /api/claims/:id/assess`), and only then is the LLM invoked. Verdicts are persisted and shown in a live pipeline UI.

**Roles in the UI.** A persona switcher separates the two responsibilities: the *R&I Scientist* tab shows only the claim/formula form (no study fields); the *Claims Evaluator* tab lists claims in `FORMULATION_TESTING` with an *Evaluate Claim* action that opens the clinical-evidence form — the claim data is displayed read-only and never re-entered.

## Tech Stack

| Layer     | Choice                                  | Why |
|-----------|------------------------------------------|-----|
| Backend   | NestJS 10 + TypeScript                   | Opinionated DI/modularity, decorators, first-class validation pipes — maintainable at team scale |
| ORM / DB  | Prisma 5 + PostgreSQL                    | Type-safe client, declarative schema + migrations; relational integrity for audit-grade data |
| LLM       | OpenAI `gpt-5.4` via official `openai` SDK | Strict JSON-schema structured outputs → machine-readable verdicts |
| Frontend  | React 19 (JSX) + Vite                    | Fast dev loop, minimal client that mirrors the API contract |
| Validation| class-validator (DTO) + zod (LLM output) | Validate at both system boundaries: HTTP input and untrusted model output |

## Repository Layout

```
loreal-claims-engine/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma          # Claim 1—N Assessment
│   │   └── seed.ts                # 3 sample claims (1 pre-assessed)
│   └── src/
│       ├── main.ts                # bootstrap, global ValidationPipe
│       ├── prisma/prisma.service.ts
│       └── claims/
│           ├── claims.controller.ts        # POST /api/claims/assess, GET /api/claims[/:id]
│           ├── claims.service.ts           # orchestration + transactions
│           ├── openai-assessor.service.ts  # LLM call, strict JSON-schema, zod parsing
│           └── dto/assess-claim.dto.ts     # request validation
├── frontend/
│   └── src/
│       ├── App.jsx
│       ├── api.js
│       └── components/  # RoleSwitcher, ClaimsPipeline, ClaimForm (Scientist), EvaluatorPanel, AssessmentResult
├── docker-compose.yml             # PostgreSQL for local dev
└── scripts/dev.sh                 # one-command bootstrap
```

## Data Model (Prisma)

- **Claim** — product, claim text, claim type (enum), INCI formula, pipeline `status` (`PROPOSED → SCREENED → FORMULATION_TESTING → UNDER_EVALUATION → ASSESSED`), submitter, timestamps.
- **Assessment** — belongs to a Claim (cascade delete). Stores the evaluator's evidence (study title, methodology, results, sample size, duration) **and** the LLM verdict (`justified`, `confidence`, `reasoning`, `model`).
- **1 Claim → N Assessments**: a claim can be re-assessed (new study, new model, new prompt version). Each verdict row is immutable — an audit trail, which regulated claims-substantiation workflows require. `model` is recorded per verdict for drift analysis.

## API

### `POST /api/claims` — Scientist creates a claim (no LLM call)

```json
{
  "productName": "Revitalift Pro-Retinol Serum 2.0",
  "claimText": "Reduces the appearance of wrinkles by 20% in 4 weeks",
  "claimType": "ANTI_AGING",
  "formula": "Aqua, Glycerin, Retinol 0.3%, Niacinamide 2%, Hyaluronic Acid 0.5%",
  "submittedBy": "R&I Scientist (Paris)"
}
```

**Response `201`** — the created claim with `status: "FORMULATION_TESTING"`, awaiting clinical evaluation.

### `POST /api/claims/:id/assess` — Evaluator attaches evidence & runs the AI assessment

```json
{
  "studyTitle": "Randomized double-blind vehicle-controlled study of 0.3% retinol serum (N=120)",
  "methodology": "120 female volunteers aged 40-60 applied the serum twice daily for 4 weeks. Wrinkle depth was measured using PRIMOS 3D optical profilometry.",
  "resultsSummary": "Mean wrinkle depth reduction of 21.3% versus 3.1% for vehicle (p<0.001).",
  "sampleSize": 120,
  "durationWeeks": 4
}
```

**Response `201`** — `{ claim, assessment }` where `assessment` = `{ justified: boolean, confidence: 0..1, reasoning: string, model, … }`.

**Errors** — `400` validation (class-validator) · `404` unknown claim · `409` claim not awaiting evaluation · `503` LLM unavailable / invalid verdict payload.

Also: `GET /api/claims` (pipeline, latest assessment per claim) and `GET /api/claims/:id` (full assessment history).

### Assessment flow (`POST /api/claims/:id/assess`)

1. Load the existing claim; reject unless it is `FORMULATION_TESTING` (`409 Conflict`) — a claim is never assessed twice by accident.
2. Flip status to `UNDER_EVALUATION`.
3. Call OpenAI with a strict `json_schema` response format (system prompt encodes the EU 1223/2009 common criteria: study design, measurement objectivity, magnitude **and** time-frame fit, formulation relevance).
4. Parse the response with zod — never trust raw model output. On any LLM failure the status rolls back to `FORMULATION_TESTING`, nothing is persisted, and the client gets `503`.
5. Persist the verdict + flip status to `ASSESSED` in a single `$transaction`.

## Setup & Run

### Local

```bash
docker compose up -d postgres          # or any local PostgreSQL
cp backend/.env.example backend/.env   # add your OpenAI key
cd backend && yarn install && yarn prisma:generate && yarn prisma:migrate && yarn seed
yarn start:dev                         # API on :8001
cd ../frontend && yarn install && yarn dev   # UI on :3000 (proxies /api → :8001)
```

Or run `./scripts/dev.sh` for a one-command bootstrap (initializes a local Postgres data dir, migrates, seeds).

### This workspace (Emergent pod)

Supervisor runs three programs: `claims-postgres` (PG 15, data dir persisted under `/app/loreal-claims-engine/.pgdata`), `claims-api` (`nest start --watch`, :8001), `claims-web` (Vite, :3000). The preview URL routes `/api/*` → :8001 and everything else → the Vite dev server.

## Design Decisions, Challenges & Trade-offs

**Thought process.** The core risk in this feature is not CRUD — it is *trusting an LLM inside a regulated business decision*. So the architecture treats the LLM as an untrusted boundary: constrained output format, schema validation, persisted audit trail, and a UI that frames the verdict as advisory ("requires evaluator sign-off").

**Challenges identified**

- *Hallucinated / malformed verdicts* → strict `json_schema` response format + zod parse; invalid payloads become `503`, never a saved verdict.
- *LLM latency (seconds) blocking the request* → acceptable for an assessor tool at MVP; roadmap moves assessment to a queue (BullMQ) with status polling.
- *Auditability* → immutable assessment rows, model name per verdict, claim status history derivable from the pipeline enum.
- *Claim/evidence mismatch* → prompt explicitly requires magnitude **and** duration fit (a 10% study cannot justify a 20% claim).

**Alternatives considered**

| Decision | Chosen | Alternative | Trade-off |
|---|---|---|---|
| API style | REST | GraphQL | One command + two reads — GraphQL adds tooling for no gain |
| Assessment execution | Synchronous in request | Queue + worker | Sync is simpler and debuggable; queue is the P1 scale path |
| ORM | Prisma | TypeORM | Prisma's generated types + migrate DX; TypeORM offers more mapping control |
| LLM output | Structured JSON schema | Free text + regex | Fragile parsing vs. guaranteed shape |
| DB | PostgreSQL | MongoDB | Verdicts are relational audit data; referential integrity matters |
| Verdict | Single model call | Multi-model consensus / human-in-loop | Cost & latency now; consensus is a roadmap item |

**Scalability & maintainability.** The NestJS module boundary (`claims` vs `prisma` vs `openai-assessor`) keeps each concern independently testable and swappable — e.g. `OpenAiAssessorService` can be replaced by a multi-provider assessor without touching the controller. Prisma migrations make schema evolution reviewable in PRs. The React client mirrors the DTO contract and holds no business logic.

## Product Roadmap (unbounded time)

- **P0** — Async assessment queue (BullMQ/Redis) with claim status `ASSESSED/FAILED` polling; retry with exponential backoff; request-id tracing.
- **P0** — AuthN/Z (4 roles from the business flow) + row-level scoping; evaluator sign-off step so no LLM verdict ships without human approval.
- **P1** — Full workflow state machine with transitions guarded per role (Business → Manager → Scientist → Evaluator), notifications, and SLA dashboards per claim type.
- **P1** — Prompt & model versioning with A/B evaluation against a golden dataset of historical claims; multi-model consensus voting.
- **P1** — Retrieval over scientific literature (vector DB) so the assessor cites prior art, not just the submitted study.
- **P2** — Regulatory report generation (EU 1223/2009 dossier export), observability (OpenTelemetry), cost guardrails, streaming verdicts (SSE).

## Interview Discussion Guide (mapped to the 9 criteria)

1. **Thought process** — see *Design Decisions*: the problem is trust in LLM output, so validation, audit, and human sign-off framing drive every layer.
2. **Scalable / maintainable / effective** — module boundaries, transactions, migrations, state-machine-ready status enum, queue-ready service seam.
3. **Evaluating requirements & challenges** — *Challenges identified*: hallucination, latency, auditability, claim/evidence mismatch; each has a concrete mitigation.
4. **Understanding the use case** — the business flow is modeled as a status enum; Scientist and Evaluator are separate UIs **and** separate API operations (the Scientist cannot submit evidence, the Evaluator never re-enters the claim/formula), with the remaining stages represented in the pipeline UI.
5. **Alternatives & trade-offs** — see the table above; every choice has a named alternative and a reason.
6. **Business process understanding** — claims substantiation is a regulated marketing-science workflow (EU 1223/2009 common criteria); the LLM advises, the evaluator decides.
7. **Research performed** — EU cosmetics claims common criteria, OpenAI structured outputs (`json_schema`, strict mode), Prisma migration/seed workflows, NestJS validation pipes.
8. **Architecture justification** — see *Tech Stack* and *Design Decisions*.
9. **Roadmap** — see *Product Roadmap* (P0/P1/P2).
