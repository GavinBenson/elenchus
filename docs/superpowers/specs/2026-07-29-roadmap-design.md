# TwentyQA — Featured Project Roadmap

## Purpose

Job-hunting portfolio project. Demonstrate senior/principal-level QA engineering
skill set: full pipeline ownership, test strategy across API/UI/DB, dashboarding,
and applied AI in QA. Audience: recruiters and hiring managers evaluating
technical depth.

## Domain

Mock application under test: hybrid HCM / ATS / SaaS system (employees, job
postings, applicants, auth) — mirrors the candidate's real work domain so test
design reads as authentic, not generic tutorial material.

## Stack Decisions

- Test framework: Playwright + TypeScript
- CI: GitHub Actions
- App under test: self-built (not a public demo site) — full ownership story

## Epics (build order)

### Epic 1 — Mock Application
Small HCM/ATS/SaaS hybrid app: REST API, database, minimal UI. Needs to be
realistic enough to support meaningful API, UI, and DB-level testing (auth,
CRUD on employees/applicants/postings, relational data).

### Epic 2 — Playwright Test Suite
Test coverage against Epic 1: API tests, UI/E2E tests, DB-level validation.
Demonstrates test strategy and architecture (page objects / fixtures, data
setup/teardown, tagging for smoke vs regression).

### Epic 3 — CI Pipeline
GitHub Actions pipeline: runs suite on push/PR, produces reports, gates
merges. Demonstrates pipeline ownership, not just test-writing.

### Epic 4 — Dashboard
Test results/trends/metrics dashboard (pass rate, flaky tests, duration
trends over time). Demonstrates ability to turn test data into decision-
making signal — a principal-level concern, not just execution.

### Epic 5 — AI Layer (bolt-on, after Epics 1-4 are solid)
- AI-assisted test generation: generate candidate test cases from an OpenAPI
  spec / requirements doc, reviewed and curated by the engineer (not blind
  autogen — the QA judgment is the selling point).
- AI visual regression: LLM-as-judge for screenshot diffing, flagging
  meaningful visual changes vs noise.

AI features are additive and deliberately deferred — they don't need to shape
the core architecture of Epics 1-4, and bolting them on later proves the core
suite stands on its own merit first.

## Ticket/PBI Structure

Each epic breaks into individual tickets, tracked in `docs/roadmap/backlog.md`
(created when Epic 1 brainstorming starts). PBI format: title, description,
acceptance criteria — standard Scrum PBI shape, doubles as another artifact
demonstrating Scrum Master background.

## Explicitly Out of Scope (for now)

- Self-healing locators — deferred indefinitely; higher risk of looking
  gimmicky in a demo than delivering credible signal.
- Testing against third-party/public demo sites — rejected in favor of
  owning the full system under test.

## Next Step

Brainstorm Epic 1 (Mock Application) as its own design spec.
