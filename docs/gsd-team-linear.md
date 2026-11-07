# GSD in a team, with Linear

GSD plans and executes; Linear records what was decided. The two must not drift.

## Tickets

- **One ticket = one shippable outcome.** If the work spans slices, split it
  *before* starting. A merged PR closes the ticket — that is only correct when the
  PR finishes it.
- **Every ticket belongs to a project.** A projectless ticket falls out of every
  view. When no milestone project fits, use a standing catch-all
  (`Tech debt and conventions`) — never leave it projectless, never open a project
  for a single ticket.
- **If a merge closes a ticket with work left, reopen it** and file the remainder
  the same day. This is the most common drift in a phase-per-milestone setup.
- One Linear project per milestone, one issue per GSD phase. Keep the mapping in
  `.planning/LINEAR.md`.
- The ticket id (`INT-<n>`) is the first token of the branch, the commit subject
  and the PR title. `Closes INT-<n>` goes in the PR body.

## Branches and commits

```
INT-42-sites-list-latest-generation
```

Conventional Commits, imperative, lowercase, under 72 characters:

```
feat(runs): stop leaving a finished run on "Read the offer"
fix(server): quota is charged twice on retry
docs(server): explain the deploy status machine
```

**The scope names the feature, never the phase number.** `fix(runs)`, not
`fix(03)`. Someone reading `git log` without `.planning/` open must understand the
change. When a GSD plan produced the commit, its id goes in the body on its own
line: `Plan: 02-01`.

Breaking change: `!` after the type/scope plus a `BREAKING CHANGE:` footer.

## Pull requests

- Never commit or push to `main`. Branch, PR, wait for CI, stop.
- **Never merge.** Merge is a human decision, always.
- Related, dependent changes are stacked (`gh stack init/add/submit`), not
  parallel PRs off `main`. One logical concern per layer.
- Rebase merge only; never squash — the individual commits are the record.
- Write the body by hand: `What this changes` / `Why` (`Closes INT-n`) /
  `How it works` / `Tests`, plus `Notes` when it applies. Never paste the commit
  list. Pass it with `--body-file`.

## The GSD cycle

```
/gsd-discuss-phase N   # optional, when the intent is unclear
/gsd-plan-phase N      # reasoning model, once
/gsd-execute-phase N   # execution model, one session
   → verification runs at the end, once
/gsd-ship              # PR
```

Rules that matter for a team:

- **One phase at a time.** Parallel phases share no cache and multiply the bill.
- **Verification runs once**, at the end of execution. Do not re-run it "to see".
  A `stale` verification means source files changed after the verifier ran —
  re-execute to regenerate the report and its digest. Never hand-edit a digest.
- **Small work is `/gsd-quick`**, not a phase. A quick task is cents; a phase is
  dollars.
- **Keep the plan-check.** It is the cheapest part of the pipeline and the only
  one that disagrees with the planner.
- `.planning/` is the source of truth for the phase, but `ROADMAP.md`,
  `REQUIREMENTS.md` and `STATE.md` drift. Resync them before a milestone audit,
  not after.

## What CI enforces

Lint, formatting, types, security scan, secret scan, unit tests, and the full
suite with a coverage floor. Two consequences for how you write a phase plan:

- a new branch needs a test, and parameters need `parametrize` ids;
- a removed or renamed public surface breaks a test before it breaks the product —
  keep that test.

## Reviewing a PR

Ask for the graph-backed review, not a diff read:

```
/gsd-code-review          # findings, severity-classified
gitnexus detect_changes   # what the graph says actually moved
```

`detect_changes` returns `partial: true` when it could not see everything — a zero
is unseen, not unaffected. Re-run it.
