# Epic 6 — ATS-Quality UI Polish

## Purpose

Epic 1 shipped a deliberately minimal UI: the app was the test target, not the
showcase. The result reads as obviously bare-bones — no navigation anywhere,
every page a `p-8` wrapper around an `<h1>` and a plain `<ul>`, the dashboard
printing three counts as `<p>` tags. That undercuts the portfolio narrative:
"I built a demo ATS using my expertise from working for a SaaS ATS."

This epic makes Elenchus look and behave like a real ATS product, without
breaking the `data-testid` contract Epic 2 depends on.

**Success criterion:** someone logs in with seeded credentials and clicks
through every route in every role without finding anything that feels
unfinished. The dashboard and applicant pipeline get extra effort as hero
screens, but consistency across all screens is the bar.

**Sequencing:** before or in parallel with Epic 2 (Playwright), per the
[roadmap](2026-07-29-roadmap-design.md). Reworking visual structure after the
test suite exists means relocating test IDs twice.

## Visual direction

Warm product palette carrying enterprise-ATS information density. Warm
off-white ground, generous row heights, soft type — with the columns, filters,
and counts a recruiter's daily tool actually shows.

Chosen over two alternatives: modern-SaaS monochrome (safest, but reads as a
Tailwind template) and enterprise-dense grey/navy (most domain-authentic, but
visually generic). The hybrid keeps the domain signal while staying
distinctive.

Accent is rust `#8a5a2b` on a `#fffdfa` ground with `#f7f1e8` panels. Stage
badges get five distinct hues rather than one flat accent, so a column of them
scans at a glance.

## Architecture

### Route group and shell

All authenticated screens move under a `(app)` route group. Route groups do not
affect URLs, so `/applicants` stays `/applicants` and no existing test breaks.

```
src/app/
  (app)/
    layout.tsx          — session resolution + sidebar + main region
    dashboard/
    applicants/
    employees/
    job-postings/
    admin/roles/
  login/                — outside the group, no sidebar
```

`src/app/(app)/layout.tsx` is a server component. It resolves the session once
for every screen beneath it and renders the shell; children render only their
own content.

### Page auth helper

Seven pages currently repeat the same cookie-read / `verifySession` / redirect
preamble. Extracted to `src/lib/page-auth.ts`:

- `requireSession()` — reads the session cookie, verifies it, redirects to
  `/login` on failure, returns the user with role.
- `requirePermission(key)` — the above plus a permission check via
  `resolveEffectivePermissions` / `hasPermission`, redirecting to `/dashboard`
  on failure.

Redirect behavior is identical to today's, so existing auth tests hold. This is
auth logic, so it gets direct unit coverage rather than being assumed correct
because it is "just a refactor".

### Sidebar

The sidebar is a client component (it needs `usePathname` for active state).
The server layout passes it nav items already filtered by the user's resolved
permissions — a user without `view_all_employees` gets no Employees link
rendered at all, not a link that 403s.

This makes navigation a visible projection of RBAC, which is a useful Epic 2
assertion surface.

### Navigation performance

Next 16's `loading.js` provides fallback UI but does not by itself guarantee
instant client-side navigation. List routes also export `unstable_instant` so
sidebar navigation feels immediate rather than merely showing a skeleton.

## Design system

### Tokens

Palette lives in `src/app/globals.css` as Tailwind v4 `@theme` tokens, named
semantically so dark mode is a token swap rather than a per-component edit:

- `--color-surface` — page ground
- `--color-panel` — cards, table rows
- `--color-rail` — sidebar
- `--color-line` — borders
- `--color-ink`, `--color-ink-muted` — text
- `--color-accent` — rust `#8a5a2b`
- `--color-stage-{applied,interview,offer,hired,rejected}` plus a paired
  background token for each

The current `globals.css` is create-next-app leftovers — `--background` /
`--foreground` placeholders and a `font-family: Arial` rule that overrides the
Geist font the layout loads. It is replaced, not extended.

### Dark mode

Class-based (`.dark` on `<html>`), toggled from the sidebar, persisted to
`localStorage`, applied by a small inline script in the root layout before
paint so there is no light flash. First visit defaults to the OS preference.

The dark ground is a warm-tinted near-black, not the light palette inverted to
neutral grey — otherwise the palette's identity is lost.

### Primitives

`src/components/ui/`, one file each, no external dependencies:

`Button` · `Input` · `Select` · `Badge` (stage-aware variants) · `Card` ·
`Table` (composable `Table` / `Th` / `Td`, not a config-driven mega-component)
· `PageHeader` (title, subtitle, actions slot) · `EmptyState` · `Skeleton` ·
`Avatar` (initials, deterministic hue from name)

Each accepts `data-testid` as a normal prop and forwards it. Test IDs stay
authored at call sites where they carry meaning; no primitive invents its own.

Hand-rolled rather than shadcn/ui: zero new dependencies, and full control of
markup keeps test-ID placement deliberate.

### One new dependency

`@dnd-kit/core` for the pipeline board. Chosen for keyboard-accessible dragging
out of the box — keyboard drag is both an accessibility requirement and a far
more stable Playwright path than simulated mouse drag.

## Data model changes

`Applicant` currently has `appliedAt` but no stage-change timestamp, so
"days in stage" — a column every real ATS shows — is not derivable.

Add to `Applicant`:

```prisma
stageChangedAt DateTime @default(now())
```

Set on every stage transition in `PATCH /api/applicants/:id/stage`. Requires a
migration and an API handler change; the OpenAPI spec is updated to match.

Applicant stages are unchanged: `applied | interview | offer | hired |
rejected`. The board is five columns, two of them terminal.

## PBIs

Fifteen PBIs in four bands. Full descriptions and acceptance criteria live in
[backlog.md](../../roadmap/backlog.md); this section covers the shape and the
sequencing logic.

**Data (6.1–6.2)** — `stageChangedAt` migration and handler change, then seed
expansion. Separate PBIs because one touches the API surface and one does not.
Both ship before any UI work, because screens designed against four applicants
come out wrong.

*Scope of "byte-identical" (amended 2026-07-31 during implementation).* The
guarantee covers fixture records' identity, values, and relationships — names,
emails, departments, titles, hire dates, stages, and who reports to or was
created by whom. It deliberately excludes `Applicant.appliedAt` and
`Applicant.stageChangedAt`, which previously took the schema's `now()` default
and were therefore different on every seed run. They now derive from a
midnight-UTC anchor. This is what makes determinism testable at all — a
`now()` default can never be deterministic — so Alex Applicant's timestamps
are midnight UTC of the seed date rather than the moment of seeding.

**Foundation (6.3–6.5)** — palette and dark-mode tokens, then UI primitives,
then the app shell. Each is independently verifiable: tokens by forcing `.dark`
and re-theming, primitives by component tests, the shell by auth and nav-
filtering tests.

The dark-mode toggle control does not ship with the tokens — it lives in the
sidebar, which does not exist until 6.5. The tokens PBI carries the dark token
set and the pre-paint script; the toggle follows.

The risk in splitting primitives away from their first consumer is building
things no screen wants. Mitigated by an explicit acceptance criterion on 6.4:
nothing is built that no screen in this epic consumes.

**Screens (6.6–6.14)** — applicants list, pipeline board, applicant detail,
job postings, employees, admin/recruiter dashboards, manager/employee
dashboards, login, roles matrix. One resource or one coherent screen pair per
PBI, each independently shippable and reviewable.

Applicants comes first among the screens because it is the epic's hero flow and
the densest use of the primitives — problems with the design system surface
there or nowhere.

**Sweep (6.15)** — click every route in every role, in light and dark, at
mobile and desktop widths. An explicit PBI because the epic's success criterion
is a click-around test, and that is only verifiable once every screen exists.

### States

Empty, loading, and error states are not a separate PBI. They are acceptance
criteria on every screen PBI, so no screen can be called done without them.

## Test ID contract

All 30 existing static test IDs, plus the dynamic `applicant-row-{id}` and
`employee-row-{id}` patterns, survive at semantically equivalent elements.

"Semantically equivalent" means the element still serves the same purpose for a
test. Moving `applicants-list` from a `<ul>` to a `<tbody>` is fine — it is
still the row container. Moving it to a wrapper `<div>` that also contains the
filter bar is not, because row-count assertions would start counting wrong.

Enforced by test, not by promise: `src/test/testid-contract.test.ts` holds the
frozen list of existing IDs and fails if any disappears from the codebase. New
IDs are appended to the file as they are introduced.

New surfaces needing IDs:

`app-sidebar` · `nav-link-{section}` · `theme-toggle` · `user-menu` ·
`applicants-search` · `filter-stage` · `filter-role` · `board-column-{stage}` ·
`board-card-{id}` · `empty-state` · `loading-skeleton` · `error-state` ·
`stat-tile-{key}`

## Testing

Playwright does not exist yet (Epic 2), so this epic's automated coverage is
Vitest:

- Primitives — `Badge` maps each stage to its variant, `EmptyState` renders,
  `Table` forwards `data-testid`.
- `page-auth.ts` — redirects unauthenticated users to `/login`, redirects
  unpermitted users to `/dashboard`, returns the user on success.
- Nav filtering — a user lacking `view_all_employees` gets no Employees link.
- Seed determinism — running the seed twice produces identical state.
- The test-ID contract test above.
- `npm run build` clean on every PBI.

Not covered automatically: whether it looks good. That is the 6.15 manual sweep,
and dark mode doubles it.

## Risks

**Drag-and-drop flake (6.7).** The highest-flake-risk feature in the project,
and Epic 2 will have to test it. That is deliberate — it is a showcase of
testing hard interactions. If it fights back during implementation, the
fallback is click-to-move via a menu on each card. The dropdown control
existing throughout both routes means the app is never broken while the board
is being sorted out.

**Primitives built without a consumer (6.4).** Splitting the design system away
from its first screen risks building the wrong abstractions. Mitigated by
scoping 6.4 to what the epic's screens actually need and accepting that later
screen PBIs may revise a primitive — the component tests make that safe.

**Half-migrated app between 6.5 and 6.15.** The shell lands before the screens
are restyled, so for several PBIs the app has good navigation wrapped around
unstyled pages. Acceptable because each PBI is still individually shippable and
nothing is broken, but the app should not be demoed mid-epic.

**Dark mode doubles visual QA.** Accepted — it is a real demo touch and another
Epic 2 test surface — but every screen PBI's acceptance includes both modes.

## Out of scope

- Mobile-first redesign. Screens must not break at mobile widths (checked in
  6.15), but the app is designed for desktop, as real ATS tools are.
- Animation and transitions beyond basic hover and focus states.
- Any change to the API surface other than `stageChangedAt`.
- Replacing the fixture users or their records — they are an Epic 2 contract.
