# gsd-toolkit

Model routing, cost control and graph-backed context for **GSD + opencode**.

Everything here was built against a real multi-project GSD install and measured
on actual session data — the numbers in [`docs/cost-control.md`](docs/cost-control.md)
come from `gsd-usage`, not from estimates.

## What's inside

| Path | What it is |
|---|---|
| `bin/gsd-credits` | Swap every agent and the default model between the Go subscription and personal credits, then rebake. |
| `bin/gsd-usage` | What your sessions actually cost, per day / model / agent, using list prices (including the Haiku 100K cliff). |
| `bin/gsd-recall` | Search every past opencode message (verbatim, no LLM, no index). Replaces memory plugins that need an API. |
| `bin/gsd-fresh` | Report or reindex every stale gitnexus index under `$HOME`. |
| `bin/gsd-compact-all` | Turn on `workflow.compact_content` in every GSD project under a root. |
| `plugins/gitnexus-guard.ts` | Blocks source edits until the code graph has been queried once — only in repos above 1 000 nodes. |
| `config/defaults.example.json` | Global GSD routing: three tiers, per-agent overrides. |
| `config/opencode.jsonc` | opencode settings that contain the context growth. |
| `config/dcp.jsonc` | Dynamic Context Pruning thresholds. |
| `AGENTS.md` | Global tool-routing rules, injected into every session. |

## Install

```bash
git clone https://github.com/SBillion/gsd-toolkit ~/Projects/gsd-toolkit
cd ~/Projects/gsd-toolkit
./install.sh
```

`install.sh` symlinks the commands into `~/.local/bin` and copies the plugin and
configs into `~/.config/opencode` **without overwriting** anything you already
have. Read the files you copy: `config/defaults.example.json` carries model IDs
that must match your provider.

Requirements: opencode 2.x, GSD 1.20+, `gitnexus`, `python3`, `node`.
The scripts use the standard library only.

## The five rules these tools exist to enforce

1. **One verification per phase.** Re-running `/gsd-execute-phase` "to see" is the
   single most expensive action in GSD. Measured: 18 verifications cost $3.39 a
   day; one costs $0.02.
2. **Plan on the reasoning model, execute on the cheap one, verify with a
   different family.** Same-family review catches nothing.
3. **Do not read a whole file to find a symbol.** `gitnexus impact` / `context`
   answers in a few hundred tokens.
4. **Keep the graph fresh.** A stale index is worse than no index — it answers
   confidently and wrongly. `gsd-fresh` runs daily.
5. **Cap tool output.** A 2 000-line dump is resent on every following step. The
   context, not the model, is what you are paying for.

## Quick start

```bash
gsd-usage --days 7 --by-agent     # where the money went
gsd-recall "why did we choose"    # what was decided, verbatim
gsd-fresh                         # which indexes are stale
gsd-credits status                # which provider is active
```

See [`docs/`](docs/) for the reasoning behind each piece:
[model routing](docs/model-routing.md) ·
[cost control](docs/cost-control.md) ·
[gitnexus](docs/gitnexus.md) ·
[GSD in a team with Linear](docs/gsd-team-linear.md).

## License

MIT
