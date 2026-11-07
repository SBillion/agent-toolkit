# GSD Toolkit

**A reference for teams using GSD — spec-driven development for coding agents —
plus the tooling we built to keep it affordable and grounded in the codebase.**

GSD runs on OpenCode, Claude Code, Codex, Gemini CLI, Cursor and a dozen other
runtimes. This repo is runtime-agnostic prose and a few small scripts; nothing
here ties you to one vendor.

---

## What GSD is

A coding agent without structure improvises. Every new session it re-discovers
the project, invents a plan, and forgets why the last one was abandoned.

GSD turns a request into **artifacts on disk** and makes each step read what the
previous one wrote:

```
discuss  →  plan  →  execute  →  verify  →  ship
```

- **discuss** — resolve the ambiguity before it becomes code.
- **plan** — a phase document: goal, tasks, acceptance criteria, threats.
- **execute** — the agent implements the plan, committing atomically.
- **verify** — a separate pass checks the code against the plan's claims, and
  writes a report with a digest.
- **ship** — PR, review, done.

The point is not bureaucracy. The point is that **the plan survives the context
window**. An agent can be compacted, restarted, or replaced by a different model
mid-phase; the files still say what was decided, what is done, and what is left.

## Why it is worth it

| Gain | What it looks like in practice |
|---|---|
| Work survives a session | A phase spans days and several agents. `STATE.md` + `ROADMAP.md` are the memory. |
| Verification is a gate, not a vibe | "Done" means a report checked the code against the plan. A `stale` report says the code moved after the check. |
| Cost is predictable | Every step has a model tier. You choose where to spend, instead of hoping. |
| Work is reviewable by humans | The plan is a document a colleague can read *before* the code exists. |
| The model is replaceable | Plans and artifacts are plain files. Switch provider without losing the work. |

On one real project, 3 phases / 13 plans produced 185 commits and ~38 k lines in
8 days. The same project went from **$49/day to $14.60/day** once routing was in
place and verification ran once per phase instead of eighteen times — same
output, fewer redundant passes. The method is in
[cost control](docs/cost-control.md).

## The honest limits

- **GSD is heavier than prompting.** A one-line fix pays for a plan you did not
  need; use `/gsd-quick`, not a phase.
- **Gates cost tokens.** The value is catching an error before it reaches the
  executor. Skip the gate and you are paying for a plan nobody checked.
- **It does not replace tests or CI.** The verifier reads code and runs checks;
  it is not a test suite, and a green verification is not a green build.
- **Discipline beats configuration.** The most expensive habit in GSD is
  re-running a phase "to see". No setting prevents it.

## What this repo adds

Beyond the method, the scripts that keep it affordable and grounded:

| Path | What it does |
|---|---|
| `bin/gsd-credits` | Swap every agent and the default model between a subscription and pay-per-token credits, then rebake. |
| `bin/gsd-usage` | What sessions actually cost — per day, model and agent, at list prices. |
| `bin/gsd-recall` | Search every past session verbatim. "What did we decide, and why?" |
| `bin/gsd-fresh` | Report or reindex stale code-graph indexes. |
| `bin/gsd-compact-all` | Turn on compact artifacts in every project under a root. |
| `plugins/gitnexus-guard.ts` | Refuses a source edit until the code graph has been queried once. |
| `config/` | Three-tier model routing, context caps, pruning thresholds. |
| `AGENTS.md` | Global tool-routing rules for the agent. |

## Quick start

```bash
git clone https://github.com/SBillion/gsd-toolkit
cd gsd-toolkit && ./install.sh

gsd-usage --days 7 --by-agent     # where the money went
gsd-recall "why did we choose"    # what was decided
gsd-fresh                         # which indexes are stale
```

`install.sh` symlinks the commands and copies the plugin/configs **without
overwriting** anything. Model IDs in `config/` must match your provider.

## Read next

| | |
|---|---|
| [Model routing](docs/model-routing.md) | Three tiers, per-agent overrides, and the three traps that silently break it |
| [Cost control](docs/cost-control.md) | Where the money goes and the five rules that bring it down |
| [gitnexus](docs/gitnexus.md) | Give the model the graph instead of the files |
| [GSD in a team with Linear](docs/gsd-team-linear.md) | Tickets, branches, stacked PRs, conventional commits |
| [Workspaces and workstreams](docs/gsd-team-workspaces.md) | Parallel features, multiple repos, shared `.planning/`, onboarding |

## A note on trust

Everything here was measured on a real install, not estimated. Where a number
comes from a single machine or a single week, the doc says so. If you adopt one
piece, adopt `gsd-usage` first — it will tell you which of the others you
actually need.

## License

MIT
