# Epic 6 Foundation (PBIs 6.3 + 6.4 + 6.5) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the design system and application shell Epic 6's screen PBIs
adopt — warm palette tokens with dark mode, a set of UI primitives, and an
`(app)` route group whose sidebar layout resolves the session once and filters
navigation by permission.

**Architecture:** Palette lives in `globals.css` as Tailwind v4 `@theme`
tokens, named semantically so dark mode is a token swap rather than a
per-component edit. Primitives in `src/components/ui/` consume only those
tokens and forward `data-testid`. The `(app)` route group holds every
authenticated screen; its layout does the session work currently copy-pasted
into seven pages, via new `src/lib/page-auth.ts` helpers.

**Tech Stack:** Next.js 16.2 (App Router), React 19.2, Tailwind v4, TypeScript,
Vitest, Prisma 7.9.

## Global Constraints

- Every existing `data-testid` must still resolve, on an element serving the
  same purpose for a test. The frozen list is enforced by a test added in
  Task 8. Current IDs: `applicant-detail`, `applicant-email`,
  `applicant-job-posting`, `applicant-name`, `applicant-pipeline`,
  `applicants-list`, `applicant-stage`, `dashboard-admin`,
  `dashboard-employee`, `dashboard-manager`, `dashboard-recruiter`,
  `employee-department`, `employee-detail`, `employees-list`,
  `employee-status`, `employee-title`, `job-posting-detail`,
  `job-postings-list`, `login-email`, `login-error`, `login-form`,
  `login-password`, `login-submit`, `manager-reports-list`,
  `recruiter-postings-list`, `roles-list`, `stage-error`,
  `stat-applicant-count`, `stat-employee-count`, `stat-posting-count`, plus
  the dynamic patterns `applicant-row-{id}` and `employee-row-{id}`.
- URLs must not change. `/applicants` stays `/applicants`. Route groups do not
  affect URLs — that is why they are used here.
- Redirect behaviour must not change: unauthenticated users go to `/login`,
  users lacking the required permission go to `/dashboard`.
- Accent colour is `#8a5a2b` on a `#fffdfa` ground with `#f7f1e8` panels. The
  dark ground is a warm-tinted near-black, not neutral grey.
- No new runtime dependencies in these three PBIs. `@dnd-kit/core` arrives in
  PBI 6.7, not here.
- Applicant stages are exactly `applied | interview | offer | hired |
  rejected`.
- `npm test` must pass and `npm run build` must stay clean after every task.
- Tests run against the real database in `DATABASE_URL`; there is no separate
  test database, and `vitest.config.ts` sets `fileParallelism: false` because
  `prisma/seed.test.ts` reseeds mid-suite. Do not change that setting. Any
  test that writes must clean up after itself.

---

## File Structure

**Created:**
- `src/app/globals.css` is rewritten (not created) — see below
- `src/lib/theme.ts` — `resolveInitialTheme()`, the pure logic behind the
  pre-paint script, so it can be unit tested
- `src/components/ui/Badge.tsx` — stage-aware badge
- `src/components/ui/Avatar.tsx` — initials + deterministic hue
- `src/components/ui/Button.tsx`, `Input.tsx`, `Select.tsx`, `Card.tsx`,
  `Table.tsx`, `PageHeader.tsx`, `EmptyState.tsx`, `Skeleton.tsx`
- `src/lib/page-auth.ts` — `requireSession()`, `requirePermission()`
- `src/lib/nav.ts` — `navItemsFor(permissions)`, the permission-filtered nav model
- `src/components/AppSidebar.tsx` — client component, active state + theme toggle
- `src/app/(app)/layout.tsx` — the authenticated shell
- `src/test/testid-contract.test.ts` — the frozen test-ID list

**Moved into `src/app/(app)/`** (URLs unchanged): `dashboard/`, `applicants/`,
`employees/`, `job-postings/`, `admin/`.

**Modified:** `src/app/layout.tsx` (pre-paint script), `vitest.config.ts`
(React plugin for component tests), `package.json` (dev dependencies for
component testing).

**Unchanged:** `src/app/login/page.tsx` stays outside the group — no sidebar on
the login screen. Its visual rework is PBI 6.13.

Primitives are one file each because they are consumed independently and a
screen PBI should be able to change one without reading the others.

---

## Task 1: Palette tokens and dark mode

**Files:**
- Modify: `src/app/globals.css` (full rewrite)
- Modify: `src/app/layout.tsx`
- Create: `src/lib/theme.ts`
- Test: `src/lib/theme.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - CSS tokens usable as Tailwind classes: `bg-surface`, `bg-panel`,
    `bg-rail`, `border-line`, `text-ink`, `text-ink-muted`, `bg-accent`,
    `text-accent`, and per-stage `bg-stage-{stage}-bg` / `text-stage-{stage}`
    for each of `applied`, `interview`, `offer`, `hired`, `rejected`.
  - `resolveInitialTheme(stored: string | null, prefersDark: boolean): 'light' | 'dark'`

The current `globals.css` is create-next-app leftovers: `--background` /
`--foreground` placeholders and a `body { font-family: Arial }` rule that
overrides the Geist font `layout.tsx` loads. It is replaced entirely.

- [ ] **Step 1: Write the failing test**

Create `src/lib/theme.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { resolveInitialTheme } from './theme'

describe('resolveInitialTheme', () => {
  it('honours a stored preference over the OS setting', () => {
    expect(resolveInitialTheme('dark', false)).toBe('dark')
    expect(resolveInitialTheme('light', true)).toBe('light')
  })

  it('falls back to the OS setting when nothing is stored', () => {
    expect(resolveInitialTheme(null, true)).toBe('dark')
    expect(resolveInitialTheme(null, false)).toBe('light')
  })

  it('ignores a stored value that is not a valid theme', () => {
    expect(resolveInitialTheme('banana', true)).toBe('dark')
    expect(resolveInitialTheme('', false)).toBe('light')
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/lib/theme.test.ts`
Expected: FAIL — cannot resolve `./theme`.

- [ ] **Step 3: Write the theme helper**

Create `src/lib/theme.ts`:

```typescript
export type Theme = 'light' | 'dark'

export const THEME_STORAGE_KEY = 'elenchus-theme'

/**
 * Decides the theme to paint on first load. A stored choice always wins;
 * otherwise fall back to the OS preference. Any stored value that is not a
 * valid theme is treated as if nothing were stored.
 */
export function resolveInitialTheme(
  stored: string | null,
  prefersDark: boolean
): Theme {
  if (stored === 'light' || stored === 'dark') return stored
  return prefersDark ? 'dark' : 'light'
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/lib/theme.test.ts`
Expected: PASS — 3 tests.

- [ ] **Step 5: Replace globals.css**

Replace the entire contents of `src/app/globals.css` with:

```css
@import "tailwindcss";

/*
 * Class-based dark mode. Tailwind v4 defaults the `dark:` variant to the OS
 * media query; we override it so a `.dark` class on <html> drives theming,
 * which is what lets the sidebar toggle override the OS preference.
 */
@custom-variant dark (&:where(.dark, .dark *));

@theme {
  /* Warm product palette. Semantic names only — dark mode swaps the values,
     never the component classes. */
  --color-surface: #fffdfa;
  --color-panel: #ffffff;
  --color-rail: #f7f1e8;
  --color-line: #ece1d2;
  --color-ink: #2b2622;
  --color-ink-muted: #a1907c;
  --color-accent: #8a5a2b;
  --color-accent-contrast: #ffffff;

  /* One hue per pipeline stage, so a column of badges scans at a glance. */
  --color-stage-applied: #6b5d4d;
  --color-stage-applied-bg: #f0ebe1;
  --color-stage-interview: #8a5a2b;
  --color-stage-interview-bg: #efe6d6;
  --color-stage-offer: #3f6470;
  --color-stage-offer-bg: #e8eef0;
  --color-stage-hired: #4a6b40;
  --color-stage-hired-bg: #e3ecdf;
  --color-stage-rejected: #9a5344;
  --color-stage-rejected-bg: #f2e4e0;

  --font-sans: var(--font-geist-sans);
  --font-mono: var(--font-geist-mono);
}

/*
 * Dark counterparts. The ground is a warm-tinted near-black rather than the
 * light palette inverted to neutral grey — inverting to grey loses the
 * palette's identity entirely.
 */
.dark {
  --color-surface: #17130f;
  --color-panel: #1e1815;
  --color-rail: #14100d;
  --color-line: #2e2621;
  --color-ink: #f0e9e1;
  --color-ink-muted: #a1907c;
  --color-accent: #c88a4a;
  --color-accent-contrast: #17130f;

  --color-stage-applied: #c4b5a2;
  --color-stage-applied-bg: #2a231d;
  --color-stage-interview: #d99a5b;
  --color-stage-interview-bg: #33261a;
  --color-stage-offer: #8fb3bf;
  --color-stage-offer-bg: #1c2a2f;
  --color-stage-hired: #9dc48f;
  --color-stage-hired-bg: #1e2a1b;
  --color-stage-rejected: #d99387;
  --color-stage-rejected-bg: #31201d;
}

body {
  background: var(--color-surface);
  color: var(--color-ink);
}
```

Note there is no `font-family` rule on `body`. The old one hardcoded Arial and
silently defeated the Geist font loaded in `layout.tsx`; `--font-sans` in
`@theme` is what makes `font-sans` resolve to Geist.

- [ ] **Step 6: Add the pre-paint script to the root layout**

In `src/app/layout.tsx`, add `suppressHydrationWarning` to the `<html>` tag
(the script mutates `class` before React hydrates, which React would otherwise
warn about), and add the script as the first child of `<head>`.

The `<html>` tag becomes:

```tsx
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script
          // Runs before first paint so a dark-mode user never sees a white
          // flash. Inlined deliberately: an external script would load too
          // late to prevent it. Kept in sync with resolveInitialTheme().
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var s=localStorage.getItem('elenchus-theme');var t=(s==='light'||s==='dark')?s:(window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');if(t==='dark')document.documentElement.classList.add('dark');}catch(e){}})();`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
```

- [ ] **Step 7: Verify the tokens resolve and dark mode works**

Run: `npm run build`
Expected: clean.

Then run `npx next dev -p 3005`, open `http://localhost:3005/login`, and in
devtools run `document.documentElement.classList.add('dark')`. The page
background must change from warm off-white to warm near-black. Run
`classList.remove('dark')` and confirm it returns. Stop the dev server.

This is the acceptance check for "forcing `.dark` re-themes the app with no
per-component edits" — there is no toggle UI yet; it ships with the sidebar in
Task 7.

- [ ] **Step 8: Run the full suite**

Run: `npm test`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add src/app/globals.css src/app/layout.tsx src/lib/theme.ts src/lib/theme.test.ts
git commit -m "feat: warm palette tokens, class-based dark mode, pre-paint theme script"
```

---

## Task 2: Component test infrastructure

**Files:**
- Modify: `package.json`
- Modify: `vitest.config.ts`
- Test: `src/components/ui/smoke.test.tsx`

**Interfaces:**
- Consumes: nothing.
- Produces: the ability to render React components in tests via
  `@testing-library/react`, using a per-file `// @vitest-environment jsdom`
  docblock.

Vitest currently runs `environment: 'node'` with no JSX transform wired in, so
no component can be rendered in a test. Tasks 3 and 4 need this. It is its own
task because it is infrastructure, not a component — a reviewer could
reasonably approve this and reject a primitive, or vice versa.

`@vitejs/plugin-react` is already a dev dependency but is not referenced by
`vitest.config.ts`.

- [ ] **Step 1: Install the testing dependencies**

Run:

```bash
npm install --save-dev @testing-library/react @testing-library/jest-dom jsdom
```

Expected: three packages added to `devDependencies`. These are dev-only, so
they do not violate the "no new runtime dependencies" constraint.

- [ ] **Step 2: Wire the React plugin into vitest**

Replace `vitest.config.ts` with:

```typescript
import 'dotenv/config'
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'node:path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    // Node by default — most tests here are API/DB tests. Component tests opt
    // into jsdom with a `// @vitest-environment jsdom` docblock.
    environment: 'node',
    // All test files share the single real database in DATABASE_URL, and
    // prisma/seed.test.ts reseeds it, so files must not run concurrently.
    fileParallelism: false,
  },
})
```

- [ ] **Step 3: Write a smoke test proving the setup works**

Create `src/components/ui/smoke.test.tsx`:

```tsx
// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'

describe('component test infrastructure', () => {
  it('renders a React component into jsdom', () => {
    render(<button data-testid="smoke">Click</button>)
    expect(screen.getByTestId('smoke')).toHaveTextContent('Click')
  })
})
```

For `toHaveTextContent` to exist, add the matchers import at the top of the
file, immediately after the environment docblock:

```tsx
import '@testing-library/jest-dom/vitest'
```

- [ ] **Step 4: Run it**

Run: `npx vitest run src/components/ui/smoke.test.tsx`
Expected: PASS — 1 test.

If it fails with "document is not defined", the environment docblock is not
the very first line of the file. It must precede all imports.

- [ ] **Step 5: Run the full suite**

Run: `npm test`
Expected: PASS — the node-environment tests are unaffected.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json vitest.config.ts src/components/ui/smoke.test.tsx
git commit -m "test: wire up jsdom and React Testing Library for component tests"
```

---

## Task 3: Badge and Avatar primitives

**Files:**
- Create: `src/components/ui/Badge.tsx`
- Create: `src/components/ui/Avatar.tsx`
- Test: `src/components/ui/Badge.test.tsx`
- Test: `src/components/ui/Avatar.test.tsx`

**Interfaces:**
- Consumes: the stage tokens from Task 1; the jsdom setup from Task 2.
- Produces:
  - `type Stage = 'applied' | 'interview' | 'offer' | 'hired' | 'rejected'`
  - `<Badge stage={Stage} data-testid?={string} />`
  - `initialsFor(name: string): string`
  - `<Avatar name={string} data-testid?={string} />`

These two are separated from the other primitives because they carry logic
worth testing — a stage-to-hue mapping and a name-to-initials derivation.
The rest are presentational and are covered in Task 4.

- [ ] **Step 1: Write the failing tests**

Create `src/components/ui/Badge.test.tsx`:

```tsx
// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Badge } from './Badge'

const STAGES = ['applied', 'interview', 'offer', 'hired', 'rejected'] as const

describe('Badge', () => {
  it('renders a human-readable label for each stage', () => {
    render(<Badge stage="interview" data-testid="b" />)
    expect(screen.getByTestId('b')).toHaveTextContent('Interview')
  })

  it('gives every stage its own distinct classes', () => {
    const seen = new Set<string>()
    for (const stage of STAGES) {
      const { unmount } = render(<Badge stage={stage} data-testid="b" />)
      const className = screen.getByTestId('b').className
      expect(className).toContain(`stage-${stage}`)
      seen.add(className)
      unmount()
    }
    // Five stages must produce five different appearances, or the badges
    // stop being scannable at a glance.
    expect(seen.size).toBe(5)
  })

  it('forwards data-testid', () => {
    render(<Badge stage="hired" data-testid="custom-id" />)
    expect(screen.getByTestId('custom-id')).toBeInTheDocument()
  })
})
```

Create `src/components/ui/Avatar.test.tsx`:

```tsx
// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Avatar, initialsFor } from './Avatar'

describe('initialsFor', () => {
  it('takes the first letter of the first and last name', () => {
    expect(initialsFor('Dana Whitfield')).toBe('DW')
    expect(initialsFor('Priya Raghunathan')).toBe('PR')
  })

  it('handles a single name', () => {
    expect(initialsFor('Cher')).toBe('C')
  })

  it('skips middle names rather than including them', () => {
    expect(initialsFor('Ana Beatriz Lima')).toBe('AL')
  })

  it('handles names with punctuation and non-ASCII characters', () => {
    expect(initialsFor('Grace O’Sullivan')).toBe('GO')
    expect(initialsFor('Oskar Novák')).toBe('ON')
  })

  it('returns an empty string for an empty name rather than throwing', () => {
    expect(initialsFor('')).toBe('')
    expect(initialsFor('   ')).toBe('')
  })
})

describe('Avatar', () => {
  it('renders the initials', () => {
    render(<Avatar name="Dana Whitfield" data-testid="a" />)
    expect(screen.getByTestId('a')).toHaveTextContent('DW')
  })

  it('gives the same name the same hue every time', () => {
    const { unmount } = render(<Avatar name="Dana Whitfield" data-testid="a" />)
    const first = screen.getByTestId('a').getAttribute('style')
    unmount()
    render(<Avatar name="Dana Whitfield" data-testid="a" />)
    expect(screen.getByTestId('a').getAttribute('style')).toBe(first)
  })

  it('gives different names different hues', () => {
    const { unmount } = render(<Avatar name="Dana Whitfield" data-testid="a" />)
    const first = screen.getByTestId('a').getAttribute('style')
    unmount()
    render(<Avatar name="Marcus Oyelaran" data-testid="a" />)
    expect(screen.getByTestId('a').getAttribute('style')).not.toBe(first)
  })
})
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run src/components/ui/Badge.test.tsx src/components/ui/Avatar.test.tsx`
Expected: FAIL — cannot resolve `./Badge` or `./Avatar`.

- [ ] **Step 3: Write Badge**

Create `src/components/ui/Badge.tsx`:

```tsx
export type Stage = 'applied' | 'interview' | 'offer' | 'hired' | 'rejected'

const LABELS: Record<Stage, string> = {
  applied: 'Applied',
  interview: 'Interview',
  offer: 'Offer',
  hired: 'Hired',
  rejected: 'Rejected',
}

// Written out rather than interpolated: Tailwind scans source for complete
// class strings, so `bg-stage-${stage}-bg` would never be generated.
const CLASSES: Record<Stage, string> = {
  applied: 'bg-stage-applied-bg text-stage-applied',
  interview: 'bg-stage-interview-bg text-stage-interview',
  offer: 'bg-stage-offer-bg text-stage-offer',
  hired: 'bg-stage-hired-bg text-stage-hired',
  rejected: 'bg-stage-rejected-bg text-stage-rejected',
}

export function Badge({
  stage,
  'data-testid': testId,
}: {
  stage: Stage
  'data-testid'?: string
}) {
  return (
    <span
      data-testid={testId}
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${CLASSES[stage]}`}
    >
      {LABELS[stage]}
    </span>
  )
}
```

- [ ] **Step 4: Write Avatar**

Create `src/components/ui/Avatar.tsx`:

```tsx
/**
 * First letter of the first and last word. Middle names are skipped so
 * "Ana Beatriz Lima" reads as AL, matching how ATS tools abbreviate.
 */
export function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return ''
  if (parts.length === 1) return parts[0][0].toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

/**
 * Deterministic hue from the name, so a person keeps the same colour across
 * every screen without storing anything.
 */
function hueFor(name: string): number {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) % 360
  }
  return hash
}

export function Avatar({
  name,
  'data-testid': testId,
}: {
  name: string
  'data-testid'?: string
}) {
  const hue = hueFor(name)
  return (
    <span
      data-testid={testId}
      aria-hidden="true"
      className="inline-flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold"
      style={{
        backgroundColor: `oklch(0.88 0.05 ${hue})`,
        color: `oklch(0.35 0.08 ${hue})`,
      }}
    >
      {initialsFor(name)}
    </span>
  )
}
```

`aria-hidden` is deliberate: the avatar duplicates the name that is always
rendered beside it, so announcing it again is noise for a screen reader.

- [ ] **Step 5: Run the tests**

Run: `npx vitest run src/components/ui/Badge.test.tsx src/components/ui/Avatar.test.tsx`
Expected: PASS.

- [ ] **Step 6: Run the full suite and build**

Run: `npm test && npm run build`
Expected: PASS, clean.

- [ ] **Step 7: Commit**

```bash
git add src/components/ui/Badge.tsx src/components/ui/Avatar.tsx src/components/ui/Badge.test.tsx src/components/ui/Avatar.test.tsx
git commit -m "feat: Badge and Avatar primitives with stage hues and deterministic initials"
```

---

## Task 4: Presentational primitives

**Files:**
- Create: `src/components/ui/Button.tsx`, `Input.tsx`, `Select.tsx`,
  `Card.tsx`, `Table.tsx`, `PageHeader.tsx`, `EmptyState.tsx`, `Skeleton.tsx`
- Test: `src/components/ui/primitives.test.tsx`

**Interfaces:**
- Consumes: tokens from Task 1, jsdom from Task 2.
- Produces:
  - `<Button variant?={'primary' | 'secondary'} {...ButtonHTMLAttributes} />`
  - `<Input {...InputHTMLAttributes} />`
  - `<Select {...SelectHTMLAttributes} />`
  - `<Card {...HTMLAttributes<HTMLDivElement>} />`
  - `<Table {...}>`, `<Th {...}>`, `<Td {...}>`, `<TableWrapper {...}>` —
    composable, all from `Table.tsx`; `TableWrapper` is the `overflow-x-auto`
    container that keeps wide tables from scrolling the page body
  - `<PageHeader title={string} subtitle?={string} actions?={ReactNode} />`
  - `<EmptyState title={string} message?={string} data-testid?={string} />`
  - `<Skeleton rows?={number} data-testid?={string} />`

All take `data-testid` through normal prop spreading rather than a special
case, so test IDs stay authored at call sites.

Nothing here is built that no Epic 6 screen consumes: `Button`/`Input`/`Select`
are the applicants list's filter bar (6.6), `Table`/`Th`/`Td` and `PageHeader`
every list screen, `Card` the dashboards (6.11), `EmptyState`/`Skeleton` the
empty and loading states required on every screen PBI.

- [ ] **Step 1: Write the failing test**

Create `src/components/ui/primitives.test.tsx`:

```tsx
// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Button } from './Button'
import { Input } from './Input'
import { Select } from './Select'
import { Card } from './Card'
import { Table, Th, Td } from './Table'
import { PageHeader } from './PageHeader'
import { EmptyState } from './EmptyState'
import { Skeleton } from './Skeleton'

describe('primitives forward data-testid', () => {
  it('Button, Input, Select, Card each forward it', () => {
    render(
      <div>
        <Button data-testid="btn">Go</Button>
        <Input data-testid="inp" />
        <Select data-testid="sel">
          <option>a</option>
        </Select>
        <Card data-testid="card">body</Card>
      </div>
    )
    for (const id of ['btn', 'inp', 'sel', 'card']) {
      expect(screen.getByTestId(id)).toBeInTheDocument()
    }
  })
})

describe('Button', () => {
  it('passes through native button attributes', () => {
    render(
      <Button data-testid="btn" disabled type="submit">
        Save
      </Button>
    )
    const btn = screen.getByTestId('btn')
    expect(btn).toBeDisabled()
    expect(btn).toHaveAttribute('type', 'submit')
  })

  it('renders visually distinct primary and secondary variants', () => {
    const { unmount } = render(<Button data-testid="b" variant="primary">P</Button>)
    const primary = screen.getByTestId('b').className
    unmount()
    render(<Button data-testid="b" variant="secondary">S</Button>)
    expect(screen.getByTestId('b').className).not.toBe(primary)
  })
})

describe('Table', () => {
  it('composes into a real table structure', () => {
    render(
      <Table data-testid="tbl">
        <thead>
          <tr>
            <Th>Name</Th>
          </tr>
        </thead>
        <tbody data-testid="rows">
          <tr>
            <Td>Dana</Td>
          </tr>
        </tbody>
      </Table>
    )
    expect(screen.getByRole('table')).toBeInTheDocument()
    expect(screen.getByRole('columnheader')).toHaveTextContent('Name')
    expect(screen.getByRole('cell')).toHaveTextContent('Dana')
    // The row container carries its own id so list assertions can count rows.
    expect(screen.getByTestId('rows')).toBeInTheDocument()
  })
})

describe('PageHeader', () => {
  it('renders title, optional subtitle, and optional actions', () => {
    render(
      <PageHeader
        title="Applicants"
        subtitle="46 candidates"
        actions={<Button data-testid="action">Add</Button>}
      />
    )
    expect(screen.getByRole('heading', { name: 'Applicants' })).toBeInTheDocument()
    expect(screen.getByText('46 candidates')).toBeInTheDocument()
    expect(screen.getByTestId('action')).toBeInTheDocument()
  })

  it('omits the subtitle element entirely when not given one', () => {
    render(<PageHeader title="Employees" />)
    expect(screen.getByRole('heading', { name: 'Employees' })).toBeInTheDocument()
    expect(screen.queryByTestId('page-subtitle')).not.toBeInTheDocument()
  })
})

describe('EmptyState and Skeleton', () => {
  it('EmptyState renders its title and message', () => {
    render(<EmptyState title="No applicants" message="Nobody has applied yet." data-testid="empty" />)
    expect(screen.getByTestId('empty')).toHaveTextContent('No applicants')
    expect(screen.getByTestId('empty')).toHaveTextContent('Nobody has applied yet.')
  })

  it('Skeleton renders the requested number of placeholder rows', () => {
    render(<Skeleton rows={4} data-testid="skel" />)
    expect(screen.getByTestId('skel').children).toHaveLength(4)
  })

  it('Skeleton defaults to a sensible number of rows', () => {
    render(<Skeleton data-testid="skel" />)
    expect(screen.getByTestId('skel').children.length).toBeGreaterThan(0)
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/components/ui/primitives.test.tsx`
Expected: FAIL — cannot resolve `./Button`.

- [ ] **Step 3: Write Button, Input, Select**

Create `src/components/ui/Button.tsx`:

```tsx
import type { ButtonHTMLAttributes } from 'react'

const VARIANTS = {
  primary: 'bg-accent text-accent-contrast border-accent font-semibold',
  secondary: 'bg-panel text-ink border-line',
}

export function Button({
  variant = 'secondary',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof VARIANTS
}) {
  return (
    <button
      {...props}
      className={`rounded-lg border px-3 py-1.5 text-sm transition-opacity hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-50 ${VARIANTS[variant]} ${className}`}
    />
  )
}
```

Create `src/components/ui/Input.tsx`:

```tsx
import type { InputHTMLAttributes } from 'react'

export function Input({
  className = '',
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`rounded-lg border border-line bg-panel px-3 py-1.5 text-sm text-ink placeholder:text-ink-muted focus:border-accent focus:outline-none ${className}`}
    />
  )
}
```

Create `src/components/ui/Select.tsx`:

```tsx
import type { SelectHTMLAttributes } from 'react'

export function Select({
  className = '',
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`rounded-lg border border-line bg-panel px-3 py-1.5 text-sm text-ink focus:border-accent focus:outline-none ${className}`}
    />
  )
}
```

- [ ] **Step 4: Write Card, Table, PageHeader**

Create `src/components/ui/Card.tsx`:

```tsx
import type { HTMLAttributes } from 'react'

export function Card({
  className = '',
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...props}
      className={`rounded-xl border border-line bg-panel p-4 ${className}`}
    />
  )
}
```

Create `src/components/ui/Table.tsx`:

```tsx
import type { HTMLAttributes, TableHTMLAttributes, ThHTMLAttributes, TdHTMLAttributes } from 'react'

/**
 * Composable rather than config-driven: callers write their own <thead> and
 * <tbody> so they control where data-testid lands. A list's row container
 * carries the list's test id, which is what row-count assertions target.
 */
export function Table({
  className = '',
  ...props
}: TableHTMLAttributes<HTMLTableElement>) {
  return (
    <table
      {...props}
      className={`w-full border-collapse text-sm text-ink ${className}`}
    />
  )
}

export function Th({
  className = '',
  ...props
}: ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      {...props}
      className={`border-y border-line px-4 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-ink-muted ${className}`}
    />
  )
}

export function Td({
  className = '',
  ...props
}: TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td
      {...props}
      className={`border-b border-line px-4 py-3 align-middle ${className}`}
    />
  )
}

export function TableWrapper({
  className = '',
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  // Wide tables scroll inside their own container so the page body never
  // scrolls horizontally on narrow viewports.
  return <div {...props} className={`overflow-x-auto ${className}`} />
}
```

Create `src/components/ui/PageHeader.tsx`:

```tsx
import type { ReactNode } from 'react'

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string
  subtitle?: string
  actions?: ReactNode
}) {
  return (
    <div className="flex items-start justify-between gap-4 pb-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-ink">{title}</h1>
        {subtitle ? (
          <p data-testid="page-subtitle" className="mt-1 text-xs text-ink-muted">
            {subtitle}
          </p>
        ) : null}
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </div>
  )
}
```

- [ ] **Step 5: Write EmptyState and Skeleton**

Create `src/components/ui/EmptyState.tsx`:

```tsx
export function EmptyState({
  title,
  message,
  'data-testid': testId,
}: {
  title: string
  message?: string
  'data-testid'?: string
}) {
  return (
    <div
      data-testid={testId}
      className="rounded-xl border border-dashed border-line bg-panel px-6 py-12 text-center"
    >
      <p className="text-sm font-semibold text-ink">{title}</p>
      {message ? <p className="mt-1 text-xs text-ink-muted">{message}</p> : null}
    </div>
  )
}
```

Create `src/components/ui/Skeleton.tsx`:

```tsx
export function Skeleton({
  rows = 5,
  'data-testid': testId,
}: {
  rows?: number
  'data-testid'?: string
}) {
  return (
    <div data-testid={testId} className="space-y-2">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="h-9 animate-pulse rounded-lg bg-rail" />
      ))}
    </div>
  )
}
```

- [ ] **Step 6: Run the tests**

Run: `npx vitest run src/components/ui/primitives.test.tsx`
Expected: PASS.

- [ ] **Step 7: Run the full suite and build**

Run: `npm test && npm run build`
Expected: PASS, clean.

- [ ] **Step 8: Commit**

```bash
git add src/components/ui
git commit -m "feat: presentational UI primitives on the warm palette tokens"
```

---

## Task 5: Page auth helpers

**Files:**
- Create: `src/lib/page-auth.ts`
- Test: `src/lib/page-auth.test.ts`

**Interfaces:**
- Consumes: `verifySession`, `SESSION_COOKIE` from `@/lib/auth`;
  `resolveEffectivePermissions`, `hasPermission` from `@/lib/permissions`.
- Produces:
  - `requireSession(): Promise<{ user: UserWithRole; permissions: Set<string> }>`
  - `requirePermission(key: string): Promise<{ user: UserWithRole; permissions: Set<string> }>`
  - where `UserWithRole` is the Prisma `User` including its `role` relation.

Seven pages currently repeat the same cookie-read / verify / redirect preamble.
This is auth logic, so it gets direct unit coverage rather than being assumed
correct because it is "just a refactor".

- [ ] **Step 1: Write the failing test**

Create `src/lib/page-auth.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

// next/navigation's redirect throws a special error to halt rendering. Model
// that: a redirect must stop execution, not fall through to the return.
const redirectMock = vi.fn((url: string) => {
  throw new Error(`REDIRECT:${url}`)
})
const cookieStore = { get: vi.fn() }

vi.mock('next/navigation', () => ({ redirect: redirectMock }))
vi.mock('next/headers', () => ({ cookies: async () => cookieStore }))

import { requireSession, requirePermission } from './page-auth'
import { signSession } from './auth'
import { db } from './db'

describe('requireSession', () => {
  beforeEach(() => {
    redirectMock.mockClear()
    cookieStore.get.mockReset()
  })

  it('redirects to /login when there is no session cookie', async () => {
    cookieStore.get.mockReturnValue(undefined)
    await expect(requireSession()).rejects.toThrow('REDIRECT:/login')
    expect(redirectMock).toHaveBeenCalledWith('/login')
  })

  it('redirects to /login when the token is not valid', async () => {
    cookieStore.get.mockReturnValue({ value: 'not-a-real-token' })
    await expect(requireSession()).rejects.toThrow('REDIRECT:/login')
  })

  it('redirects to /login when the token is valid but the user is gone', async () => {
    cookieStore.get.mockReturnValue({ value: signSession('deleted-user-id') })
    await expect(requireSession()).rejects.toThrow('REDIRECT:/login')
  })

  it('returns the user and their permissions for a valid session', async () => {
    const admin = await db.user.findFirstOrThrow({
      where: { email: 'admin@elenchus.test' },
    })
    cookieStore.get.mockReturnValue({ value: signSession(admin.id) })

    const { user, permissions } = await requireSession()
    expect(user.email).toBe('admin@elenchus.test')
    expect(user.role.name).toBe('admin')
    expect(permissions.has('view_all_employees')).toBe(true)
    expect(redirectMock).not.toHaveBeenCalled()
  })
})

describe('requirePermission', () => {
  beforeEach(() => {
    redirectMock.mockClear()
    cookieStore.get.mockReset()
  })

  it('redirects to /dashboard when the user lacks the permission', async () => {
    const employee = await db.user.findFirstOrThrow({
      where: { email: 'employee@elenchus.test' },
    })
    cookieStore.get.mockReturnValue({ value: signSession(employee.id) })

    await expect(requirePermission('view_all_employees')).rejects.toThrow(
      'REDIRECT:/dashboard'
    )
  })

  it('returns the user when they hold the permission', async () => {
    const admin = await db.user.findFirstOrThrow({
      where: { email: 'admin@elenchus.test' },
    })
    cookieStore.get.mockReturnValue({ value: signSession(admin.id) })

    const { user } = await requirePermission('view_all_employees')
    expect(user.email).toBe('admin@elenchus.test')
    expect(redirectMock).not.toHaveBeenCalled()
  })

  it('redirects an unauthenticated caller to /login, not /dashboard', async () => {
    cookieStore.get.mockReturnValue(undefined)
    await expect(requirePermission('view_all_employees')).rejects.toThrow(
      'REDIRECT:/login'
    )
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/lib/page-auth.test.ts`
Expected: FAIL — cannot resolve `./page-auth`.

- [ ] **Step 3: Write the helpers**

Create `src/lib/page-auth.ts`:

```typescript
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { verifySession, SESSION_COOKIE } from '@/lib/auth'
import { resolveEffectivePermissions, hasPermission } from '@/lib/permissions'

/**
 * Resolves the logged-in user for a page, redirecting to /login if there is
 * no valid session. Replaces the cookie/verify/redirect preamble that was
 * copy-pasted into every page component.
 */
export async function requireSession() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value
  const session = token ? verifySession(token) : null
  if (!session) redirect('/login')

  const user = await db.user.findUnique({
    where: { id: session.userId },
    include: { role: true },
  })
  // A token can outlive its user; treat that as unauthenticated.
  if (!user) redirect('/login')

  const permissions = await resolveEffectivePermissions(user.id)
  return { user, permissions }
}

/**
 * As requireSession, plus a permission gate. An unauthenticated caller still
 * goes to /login; an authenticated one lacking the permission goes to
 * /dashboard, which every role can see.
 */
export async function requirePermission(key: string) {
  const { user, permissions } = await requireSession()
  if (!hasPermission(permissions, key)) redirect('/dashboard')
  return { user, permissions }
}
```

- [ ] **Step 4: Run the test**

Run: `npx vitest run src/lib/page-auth.test.ts`
Expected: PASS — 7 tests.

- [ ] **Step 5: Run the full suite and build**

Run: `npm test && npm run build`
Expected: PASS, clean.

- [ ] **Step 6: Commit**

```bash
git add src/lib/page-auth.ts src/lib/page-auth.test.ts
git commit -m "feat: requireSession and requirePermission page auth helpers"
```

---

## Task 6: Permission-filtered navigation model

**Files:**
- Create: `src/lib/nav.ts`
- Test: `src/lib/nav.test.ts`

**Interfaces:**
- Consumes: `hasPermission` from `@/lib/permissions`.
- Produces:
  - `type NavItem = { href: string; label: string; testId: string; permission?: string }`
  - `navItemsFor(permissions: Set<string>): NavItem[]`

Separated from the sidebar component because it is pure logic and deserves
direct tests — nav contents are a visible projection of RBAC, which makes them
a useful Epic 2 assertion surface.

- [ ] **Step 1: Write the failing test**

Create `src/lib/nav.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { navItemsFor } from './nav'

describe('navItemsFor', () => {
  it('always shows Dashboard and Applicants, which need no permission', () => {
    const items = navItemsFor(new Set())
    expect(items.map((i) => i.label)).toContain('Dashboard')
    expect(items.map((i) => i.label)).toContain('Applicants')
  })

  it('hides Employees from a user without view_all_employees', () => {
    const items = navItemsFor(new Set())
    expect(items.map((i) => i.label)).not.toContain('Employees')
  })

  it('shows Employees to a user with view_all_employees', () => {
    const items = navItemsFor(new Set(['view_all_employees']))
    expect(items.map((i) => i.label)).toContain('Employees')
  })

  it('hides the roles admin from a user without manage_roles', () => {
    const items = navItemsFor(new Set(['view_all_employees']))
    expect(items.map((i) => i.href)).not.toContain('/admin/roles')
  })

  it('shows the roles admin to a user with manage_roles', () => {
    const items = navItemsFor(new Set(['manage_roles']))
    expect(items.map((i) => i.href)).toContain('/admin/roles')
  })

  it('gives an admin every item', () => {
    const all = navItemsFor(
      new Set([
        'view_all_employees',
        'edit_employees',
        'edit_job_postings',
        'delete_applicant',
        'manage_roles',
      ])
    )
    const none = navItemsFor(new Set())
    expect(all.length).toBeGreaterThan(none.length)
  })

  it('gives every item a unique, stable test id', () => {
    const items = navItemsFor(new Set(['view_all_employees', 'manage_roles']))
    const ids = items.map((i) => i.testId)
    expect(new Set(ids).size).toBe(ids.length)
    expect(ids.every((id) => id.startsWith('nav-link-'))).toBe(true)
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/lib/nav.test.ts`
Expected: FAIL — cannot resolve `./nav`.

- [ ] **Step 3: Write the nav model**

Create `src/lib/nav.ts`:

```typescript
import { hasPermission } from '@/lib/permissions'

export type NavItem = {
  href: string
  label: string
  testId: string
  /** Omitted means every authenticated user sees it. */
  permission?: string
}

const ALL_ITEMS: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', testId: 'nav-link-dashboard' },
  { href: '/applicants', label: 'Applicants', testId: 'nav-link-applicants' },
  { href: '/job-postings', label: 'Job postings', testId: 'nav-link-job-postings' },
  {
    href: '/employees',
    label: 'Employees',
    testId: 'nav-link-employees',
    permission: 'view_all_employees',
  },
  {
    href: '/admin/roles',
    label: 'Roles & permissions',
    testId: 'nav-link-admin-roles',
    permission: 'manage_roles',
  },
]

/**
 * The nav a given user should see. Links they cannot use are not rendered at
 * all rather than rendered and 403ing, so navigation is a visible projection
 * of their effective permissions.
 */
export function navItemsFor(permissions: Set<string>): NavItem[] {
  return ALL_ITEMS.filter(
    (item) => !item.permission || hasPermission(permissions, item.permission)
  )
}
```

- [ ] **Step 4: Run the test**

Run: `npx vitest run src/lib/nav.test.ts`
Expected: PASS — 7 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/nav.ts src/lib/nav.test.ts
git commit -m "feat: permission-filtered navigation model"
```

---

## Task 7: The app shell

**Files:**
- Create: `src/components/AppSidebar.tsx`
- Create: `src/app/(app)/layout.tsx`
- Move: `src/app/dashboard/` → `src/app/(app)/dashboard/`
- Move: `src/app/applicants/` → `src/app/(app)/applicants/`
- Move: `src/app/employees/` → `src/app/(app)/employees/`
- Move: `src/app/job-postings/` → `src/app/(app)/job-postings/`
- Move: `src/app/admin/` → `src/app/(app)/admin/`
- Modify: every moved `page.tsx` — replace the auth preamble with the helpers

**Interfaces:**
- Consumes: `requireSession` / `requirePermission` (Task 5), `navItemsFor`
  (Task 6), `THEME_STORAGE_KEY` (Task 1).
- Produces: `data-testid` values `app-sidebar`, `theme-toggle`, `user-menu`,
  and `nav-link-{section}` per Task 6.

`/login` stays outside the group — it must not render a sidebar.

- [ ] **Step 1: Write the sidebar**

Create `src/components/AppSidebar.tsx`:

```tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import type { NavItem } from '@/lib/nav'
import { THEME_STORAGE_KEY, type Theme } from '@/lib/theme'

export function AppSidebar({
  items,
  userEmail,
  roleName,
}: {
  items: NavItem[]
  userEmail: string
  roleName: string
}) {
  const pathname = usePathname()
  const [theme, setTheme] = useState<Theme>('light')

  // The pre-paint script in the root layout already set the class; read it
  // back rather than recomputing, so the toggle starts in the right position.
  useEffect(() => {
    setTheme(document.documentElement.classList.contains('dark') ? 'dark' : 'light')
  }, [])

  function toggleTheme() {
    const next: Theme = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    document.documentElement.classList.toggle('dark', next === 'dark')
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next)
    } catch {
      // Storage can be unavailable (private mode); the toggle still works for
      // this session, it just will not persist.
    }
  }

  return (
    <nav
      data-testid="app-sidebar"
      className="flex w-56 shrink-0 flex-col border-r border-line bg-rail p-3"
    >
      <div className="px-2 pb-4">
        <p className="text-sm font-semibold tracking-tight text-ink">Elenchus</p>
        <p data-testid="user-menu" className="mt-0.5 text-[11px] text-ink-muted">
          {userEmail} · {roleName}
        </p>
      </div>

      <div className="flex-1 space-y-0.5">
        {items.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(`${item.href}/`)
          return (
            <Link
              key={item.href}
              href={item.href}
              data-testid={item.testId}
              aria-current={active ? 'page' : undefined}
              className={`block rounded-lg px-2.5 py-1.5 text-[13px] ${
                active
                  ? 'bg-panel font-semibold text-ink shadow-sm'
                  : 'text-ink-muted hover:text-ink'
              }`}
            >
              {item.label}
            </Link>
          )
        })}
      </div>

      <div className="space-y-0.5 border-t border-line pt-2">
        <button
          type="button"
          data-testid="theme-toggle"
          onClick={toggleTheme}
          aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          className="w-full rounded-lg px-2.5 py-1.5 text-left text-[13px] text-ink-muted hover:text-ink"
        >
          {theme === 'dark' ? 'Light mode' : 'Dark mode'}
        </button>
        <form action="/api/auth/logout" method="post">
          <button
            type="submit"
            data-testid="logout-button"
            className="w-full rounded-lg px-2.5 py-1.5 text-left text-[13px] text-ink-muted hover:text-ink"
          >
            Sign out
          </button>
        </form>
      </div>
    </nav>
  )
}
```

- [ ] **Step 2: Write the group layout**

Create `src/app/(app)/layout.tsx`:

```tsx
import { requireSession } from '@/lib/page-auth'
import { navItemsFor } from '@/lib/nav'
import { AppSidebar } from '@/components/AppSidebar'

/**
 * The authenticated shell. Resolves the session once for every screen beneath
 * it, so pages no longer repeat the cookie/verify/redirect preamble. Route
 * groups do not affect URLs — /applicants is still /applicants.
 */
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, permissions } = await requireSession()

  return (
    <div className="flex min-h-screen bg-surface">
      <AppSidebar
        items={navItemsFor(permissions)}
        userEmail={user.email}
        roleName={user.role.name}
      />
      <main className="min-w-0 flex-1 px-6 py-5">{children}</main>
    </div>
  )
}
```

- [ ] **Step 3: Move the route directories**

Run:

```bash
mkdir -p "src/app/(app)"
git mv src/app/dashboard "src/app/(app)/dashboard"
git mv src/app/applicants "src/app/(app)/applicants"
git mv src/app/employees "src/app/(app)/employees"
git mv src/app/job-postings "src/app/(app)/job-postings"
git mv src/app/admin "src/app/(app)/admin"
```

Do **not** move `src/app/login`, `src/app/api`, `src/app/page.tsx`,
`src/app/layout.tsx`, or `src/app/globals.css`.

- [ ] **Step 4: Replace the auth preamble in each moved page**

Every moved page currently opens with some variant of:

```typescript
  const token = (await cookies()).get(SESSION_COOKIE)?.value
  const session = token ? verifySession(token) : null
  if (!session) redirect('/login')
```

In each of the seven page files, delete that preamble along with the now-unused
`cookies`, `redirect`, `verifySession`, and `SESSION_COOKIE` imports, and use
the helper instead.

For pages with no permission gate — `(app)/dashboard/page.tsx`,
`(app)/applicants/page.tsx`, `(app)/applicants/[id]/page.tsx`,
`(app)/job-postings/page.tsx`, `(app)/job-postings/[id]/page.tsx`:

```typescript
import { requireSession } from '@/lib/page-auth'

// ...inside the component, as the first statement:
  const { user } = await requireSession()
```

Keep whatever the page already did with the resolved user. `dashboard/page.tsx`
reads `user.role.name` — `requireSession` returns the user with `role`
included, so that keeps working unchanged.

If a page does not use `user` at all, destructure nothing:

```typescript
  await requireSession()
```

For pages with a permission gate, replace both the preamble and the existing
permission check. `(app)/employees/page.tsx` and
`(app)/employees/[id]/page.tsx` currently do:

```typescript
  const permissions = await resolveEffectivePermissions(session.userId)
  if (!hasPermission(permissions, 'view_all_employees')) redirect('/dashboard')
```

which becomes:

```typescript
import { requirePermission } from '@/lib/page-auth'

// ...inside the component, as the first statement:
  await requirePermission('view_all_employees')
```

and `(app)/admin/roles/page.tsx` becomes:

```typescript
  await requirePermission('manage_roles')
```

Remove the `resolveEffectivePermissions` / `hasPermission` imports from those
three files once unused.

**Do not change any page's markup or `data-testid` in this task.** The pages
render inside the shell as-is; restyling them is what PBIs 6.6 onward do. This
keeps the diff reviewable — a shell change plus a visual change in one commit
is hard to review.

- [ ] **Step 5: Verify the URLs and build**

Run: `npm run build`

Expected: clean, and the route list still shows `/dashboard`, `/applicants`,
`/applicants/[id]`, `/employees`, `/employees/[id]`, `/job-postings`,
`/job-postings/[id]`, `/admin/roles` — **without** any `(app)` segment. If
`(app)` appears in a URL, the parentheses were lost and it stopped being a
route group.

- [ ] **Step 6: Verify the shell by hand**

Run `npx next dev -p 3005` and check each of these, then stop the server:

- `admin@elenchus.test` / `password123` sees all five nav links.
- `employee@elenchus.test` sees Dashboard, Applicants and Job postings, but
  **no** Employees link and **no** Roles link.
- Visiting `/employees` directly as the employee user still redirects to
  `/dashboard`.
- Visiting `/applicants` while logged out redirects to `/login`.
- `/login` renders with no sidebar.
- The theme toggle switches the palette, and the choice survives a reload with
  no flash of the wrong theme.

- [ ] **Step 7: Run the full suite**

Run: `npm test`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: (app) route group with permission-filtered sidebar shell"
```

---

## Task 8: Test ID contract

**Files:**
- Create: `src/test/testid-contract.test.ts`

**Interfaces:**
- Consumes: the codebase as it stands after Task 7.
- Produces: a frozen list of test IDs that later PBIs must not break.

The roadmap calls test IDs a contract Epic 2 depends on. This makes that
enforceable rather than aspirational — every screen PBI from 6.6 onward
rewrites markup, and this test fails the moment one of them drops an ID.

- [ ] **Step 1: Write the test**

Create `src/test/testid-contract.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'

/**
 * Test IDs are a contract with the Playwright suite (Epic 2). Epic 6 rewrites
 * every screen's markup, so this test freezes the IDs that already exist: an
 * ID may move to a different element serving the same purpose, but it may not
 * disappear. Add new IDs here as they are introduced.
 */
const FROZEN_TEST_IDS = [
  'applicant-detail',
  'applicant-email',
  'applicant-job-posting',
  'applicant-name',
  'applicant-pipeline',
  'applicant-stage',
  'applicants-list',
  'dashboard-admin',
  'dashboard-employee',
  'dashboard-manager',
  'dashboard-recruiter',
  'employee-department',
  'employee-detail',
  'employee-status',
  'employee-title',
  'employees-list',
  'job-posting-detail',
  'job-postings-list',
  'login-email',
  'login-error',
  'login-form',
  'login-password',
  'login-submit',
  'manager-reports-list',
  'recruiter-postings-list',
  'roles-list',
  'stage-error',
  'stat-applicant-count',
  'stat-employee-count',
  'stat-posting-count',
  // Added by the app shell (PBI 6.5).
  'app-sidebar',
  'user-menu',
  'theme-toggle',
  'logout-button',
  'nav-link-dashboard',
  'nav-link-applicants',
  'nav-link-job-postings',
  'nav-link-employees',
  'nav-link-admin-roles',
]

/**
 * Dynamic ids are built from a template literal, so they never appear as a
 * complete string in source. Match the template instead.
 */
const FROZEN_TEMPLATES = ['applicant-row-${', 'employee-row-${']

async function collectSourceFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true })
  const files = await Promise.all(
    entries.map(async (entry) => {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) return collectSourceFiles(full)
      return entry.name.endsWith('.tsx') || entry.name.endsWith('.ts') ? [full] : []
    })
  )
  return files.flat()
}

describe('data-testid contract', () => {
  it('never drops a test id the Playwright suite depends on', async () => {
    const files = await collectSourceFiles(path.resolve(__dirname, '..'))
    const sources = await Promise.all(
      files
        .filter((f) => !f.endsWith('.test.ts') && !f.endsWith('.test.tsx'))
        .map((f) => readFile(f, 'utf8'))
    )
    const haystack = sources.join('\n')

    const missing = FROZEN_TEST_IDS.filter(
      (id) => !haystack.includes(`"${id}"`) && !haystack.includes(`'${id}'`)
    )
    expect(missing).toEqual([])

    const missingTemplates = FROZEN_TEMPLATES.filter((t) => !haystack.includes(t))
    expect(missingTemplates).toEqual([])
  })
})
```

- [ ] **Step 2: Run it**

Run: `npx vitest run src/test/testid-contract.test.ts`

Expected: PASS. If any id is reported missing, it was dropped during Task 7's
page edits — restore it rather than deleting it from the frozen list.

- [ ] **Step 3: Prove the test can fail**

Temporarily delete the `data-testid="app-sidebar"` attribute from
`src/components/AppSidebar.tsx`, re-run the test, and confirm it FAILS
reporting `app-sidebar` as missing. Restore the attribute and confirm it
passes. A contract test that cannot fail enforces nothing.

- [ ] **Step 4: Run the full suite and build**

Run: `npm test && npm run build`
Expected: PASS, clean.

- [ ] **Step 5: Mark the PBIs done**

In `docs/roadmap/backlog.md`, change three headings:

```markdown
### PBI 6.3 — [DONE] Palette and dark mode tokens
### PBI 6.4 — [DONE] UI primitives
### PBI 6.5 — [DONE] App shell
```

- [ ] **Step 6: Commit**

```bash
git add src/test/testid-contract.test.ts docs/roadmap/backlog.md
git commit -m "test: freeze the data-testid contract, mark PBIs 6.3-6.5 done"
```

---

## Acceptance Criteria Coverage

**PBI 6.3 — Palette and dark mode tokens**

| Criterion | Task |
|---|---|
| Semantic tokens in both light and dark | 1 |
| Stale `font-family: Arial` gone, Geist applies | 1 (Step 5) |
| Forcing `.dark` re-themes with no per-component edits | 1 (Step 7) |
| No light flash on load | 1 (Step 6), verified in 7 (Step 6) |

**PBI 6.4 — UI primitives**

| Criterion | Task |
|---|---|
| Every primitive forwards `data-testid` | 3, 4 |
| `Badge` maps each of five stages to its own variant | 3 |
| `Avatar` derives deterministic initials and hue | 3 |
| Component tests cover the above | 2 (infra), 3, 4 |
| Nothing built that no screen consumes | 4 (rationale stated per primitive) |

**PBI 6.5 — App shell**

| Criterion | Task |
|---|---|
| URLs unchanged; existing test IDs still resolve | 7 (Step 5), 8 |
| Nav filtered by resolved permissions | 6, 7 |
| Dark mode toggles, persists, defaults to OS preference | 1, 7 |
| `requireSession` / `requirePermission` unit-tested | 5 |
| `testid-contract.test.ts` exists and passes | 8 |
| Existing pages render in the shell without visual rework | 7 (Step 4) |
