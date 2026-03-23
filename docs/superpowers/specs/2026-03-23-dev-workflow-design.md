# KTM Cargo — Developer Workflow Design

**Date:** 2026-03-23
**Author:** Solo Developer
**Status:** Approved

---

## Context

KTM Cargo Express is a solo-developed React + Supabase logistics platform (BKK→YGN cargo route). The primary pain point is unclear priority — not knowing whether to fix bugs, build features, or handle infrastructure at any given time.

---

## Goals

- Separate concerns clearly: bugs, features, and chores never compete on the same axis
- Make priority obvious without thinking — a decision tree, not a judgment call
- Lightweight enough for one developer to maintain without overhead

---

## Approach: Dual-track GitHub Board (Track C)

One GitHub Projects board with three independent tracks. Each track has its own columns and priority logic. The tracks never merge — a bug does not compete with a feature for "what's next." The hard rule is applied first, then within-track priority applies.

**Hard priority rule:**
```
P0 Bug > P1 Bug > Feature (Priority) > P2 Bug > Chore
```

---

## Board Structure

```
┌──────────────┬──────────────┬──────────────┐
│  TRACK 1     │  TRACK 2     │  TRACK 3     │
│  Bug/Fix     │  Feature     │  Chore       │
├──────────────┼──────────────┼──────────────┤
│  Triage      │  Ideas       │  Backlog     │
│  P0 Now      │  Priority    │  Scheduled   │
│  P1 Next     │  Building    │  Done        │
│  P2 Later    │  Done        │              │
│  Done        │              │              │
└──────────────┴──────────────┴──────────────┘
```

### Track 1 — Bug/Fix
All defects: data integrity, wrong calculations, crashes, security issues.

| Column | Meaning |
|--------|---------|
| Triage | New bug, not yet assessed |
| P0 Now | Stop everything, fix today |
| P1 Next | Fix this sprint |
| P2 Later | Fix when possible |
| Done | Resolved and closed |

### Track 2 — Feature
New capabilities and improvements visible to customers or staff.

| Column | Meaning |
|--------|---------|
| Ideas | Captured, not yet prioritized |
| Priority | Ranked by business impact, ready to build |
| Building | In progress |
| Done | Merged and deployed |

### Track 3 — Chore
Dependency updates, CI changes, migrations, refactoring with no behavior change.

| Column | Meaning |
|--------|---------|
| Backlog | Pending, not yet scheduled |
| Scheduled | Targeted for this week |
| Done | Completed |

---

## Label System

### Type Labels
| Label | Color | Usage |
|-------|-------|-------|
| `bug` | 🔴 Red | Data/logic error |
| `feature` | 🟢 Green | New capability |
| `chore` | 🔵 Blue | Infra / deps / refactor |
| `docs` | ⚪ Gray | Documentation only |

### Priority Labels
| Label | Usage |
|-------|-------|
| `P0` | Data corrupt, security, financial data wrong, stop everything |
| `P1` | Internal crash, wrong internal display, fix this sprint |
| `P2` | Minor UX issue, cosmetic, fix when possible |

### Area Labels
```
area:invoices
area:shipments
area:shopping-orders
area:procurement
area:auth
area:ci
area:deps
```

---

## Branch Naming Convention

```
<type>/<issue-number>-<short-description>
```

**Examples:**
```
bug/123-invoice-null-guard
feature/124-bulk-shipment-export
chore/125-upgrade-vite-8
fix/126-po-rebalance-rollback
```

**P0 hotfix rule:** P0 bugs use the same `bug/<issue>-<desc>` convention — no special `hotfix/` prefix needed. Stash or shelve current work-in-progress branch, create the bug branch from `main`, fix and merge, then resume the previous branch.

Every branch must include the GitHub Issue number so PRs auto-link and issues auto-close on merge.

---

## Commit Message Convention

```
<prefix>(<area>): <description> (#<issue>)
```

| Prefix | Usage |
|--------|-------|
| `fix` | Bug fix |
| `feat` | New feature |
| `chore` | Deps / CI / migration |
| `docs` | Documentation |
| `refactor` | Code restructure, no behavior change |

**Examples:**
```
fix(shipments): guard customers.find() null (#123)
feat(invoices): add bulk export to CSV (#124)
chore(deps): upgrade vite to 8.x (#125)
```

---

## Automation Rules

> ⚠️ **Implementation note:** Label-to-column automations are not built-in GitHub Projects features. They require a custom GitHub Actions workflow (`.github/workflows/board-automation.yml`) using the GitHub GraphQL Projects API or a community action such as `leonsteinhaeuser/project-beta-automations`. Plan for this setup on board creation day.

| Trigger | Action |
|---------|--------|
| Issue labeled `P0` | Move to **P0 Now** |
| Issue labeled `P1` | Move to **P1 Next** |
| Issue labeled `P2` | Move to **P2 Later** |
| Issue labeled `feature` | Move to **Ideas** |
| Issue labeled `chore` | Move to **Backlog** |
| PR opened (linked issue) | Move to **Building / In Progress** |
| PR merged | Move to **Done** + close issue |
| Dependabot PR opened | Auto-label `chore` + `area:deps` |

---

## Priority Decision Tree

```
New issue arrives:

Was this working before the last merge? (regression check)
├── Yes → Escalate one priority level from the result below
└── No  → Continue ↓

Is it a bug?
├── Yes → Does it corrupt data, expose a security hole,
│         OR affect customer-visible financial data
│         (invoices, totals, shipping fees)?
│         ├── Yes → P0 (stop current work, fix today)
│         └── No  → Does it crash the app or produce
│                   wrong data in internal views?
│                   ├── Yes → P1 (fix this sprint)
│                   └── No  → P2 (add to backlog)
└── No  → Feature or Chore?
          ├── Feature → Add to Ideas → rank by business impact
          └── Chore   → Add to Backlog → batch on Monday triage
```

**Regression escalation example:**
A bug that would normally be P1 (wrong internal display) becomes P0 if it was introduced by the last merge and affects customer-facing data.

---

## Issue Templates

Three templates in `.github/ISSUE_TEMPLATE/`:

### bug_report.md
```yaml
name: Bug Report
about: Something is broken
labels: bug
body:
  - type: dropdown
    id: severity
    label: Severity
    options:
      - P0 — Financial data wrong / data corrupt / security
      - P1 — App crash / wrong internal data
      - P2 — Minor UX / cosmetic
  - type: dropdown
    id: area
    label: Area
    options: [invoices, shipments, shopping-orders, procurement, auth, ci]
  - type: textarea
    label: What happened
  - type: textarea
    label: Expected behaviour
```

> **Label mapping:** After submitting, the developer reads the severity field during triage and manually applies the matching `P0`, `P1`, or `P2` label. The board automation then moves the card to the correct column automatically. This is a one-step manual action per bug — not automated, by design, to force a deliberate triage decision.

### feature_request.md
```yaml
name: Feature Request
about: New capability
labels: feature
body:
  - type: textarea
    label: What problem does this solve for the customer?
  - type: textarea
    label: Proposed solution
```

### chore.md
```yaml
name: Chore
about: Infra, deps, refactor
labels: chore
body:
  - type: dropdown
    label: Area
    options: [ci, deps, migration, refactor]
  - type: textarea
    label: What needs to be done and why
```

---

## Daily Workflow

### Day Start (~5 min)
1. Check **P0 Now** — if anything exists, that is today's work, no exceptions
2. Check **P1 Next** — if multiple P1s exist, pick the one with the **oldest creation date** unless one has an explicit dependency on another (noted in issue comments)
3. Set a target: close 1–2 issues today

### During Work
- One issue = one branch
- Every commit references the issue number
- PR → CI pass → merge → move to next

### Day End (~3 min)
- Leave a comment on any open issue with current status
- Check if tomorrow's target needs a label change

---

## Weekly Triage (Monday, ~10 min)

1. **Dependabot PRs** — safe (patch/minor) → merge; major version → create chore issue, schedule, close the Dependabot PR
2. **New bugs** — assign P0/P1/P2 using the decision tree, add area label
3. **Feature Ideas** — rank top 3 by business impact, move to Priority
4. **P2 backlog** — close any issue with no new comments, commits, or label changes in the past 30 days. Close with label `stale` and comment: *"Closing as stale after 30 days of no activity. Reopen if still relevant."*

---

## What This Does Not Cover

- Deployment pipeline (Vercel handles this automatically)
- Release tagging (handled by `release.yml` on `v*` tags)
- Team review process (solo developer — not applicable)
