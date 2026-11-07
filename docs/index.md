---
layout: default
title: Start here
---

# GSD Toolkit

Spec-driven development for coding agents, and the tooling that keeps it
affordable and grounded in the codebase.

## What GSD is

A coding agent without structure improvises: every session re-discovers the
project, invents a plan, forgets why the last one was abandoned.

GSD turns a request into **artifacts on disk** and makes each step read what the
previous one wrote:

```
discuss  →  plan  →  execute  →  verify  →  ship
```

The plan survives the context window. An agent can be compacted, restarted or
replaced mid-phase; the files still say what was decided, what is done and what
is left.

## The gains

- **Work survives a session** — a phase spans days and several agents.
- **Verification is a gate** — "done" means a report checked the code against
  the plan.
- **Cost is predictable** — every step has a model tier.
- **Reviewable by humans** — the plan is a document a colleague reads before the
  code exists.
- **The model is replaceable** — artifacts are plain files.

## The honest limits

GSD is heavier than prompting, its gates cost tokens, it does not replace tests
or CI, and no setting prevents the most expensive habit: re-running a phase
"to see".

## Read next

- [Model routing](model-routing.md) — three tiers, and the traps that break them
- [Cost control](cost-control.md) — where the money goes
- [gitnexus](gitnexus.md) — the graph instead of the files
- [GSD in a team with Linear](gsd-team-linear.md) — tickets, branches, PRs
- [Workspaces and workstreams](gsd-team-workspaces.md) — parallel work, onboarding

The scripts are in [`bin/`](https://github.com/SBillion/gsd-toolkit/tree/main/bin);
the install notes are in the
[README](https://github.com/SBillion/gsd-toolkit#readme).
