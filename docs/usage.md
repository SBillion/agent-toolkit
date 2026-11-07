---
layout: default
title: Using the toolkit
---

# Using it, start to finish

Three steps: once per machine, once per repo, then the daily loop.

## 1. Once per machine

```bash
git clone https://github.com/SBillion/agent-toolkit
cd agent-toolkit && ./install.sh
```

`install.sh` symlinks `bin/*` into `~/.local/bin`, installs the gitnexus guard
plugin and `config/dcp.jsonc`, and **never overwrites** an existing file. It
prints the three things it will not copy for you:

- `config/opencode.jsonc` → merge into `~/.config/opencode/opencode.jsonc`;
- `config/defaults.example.json` → `~/.gsd/defaults.json`, then rebake;
- `AGENTS.md` → `~/.config/opencode/AGENTS.md`.

Check the install:

```bash
gsd-usage --days 7 --by-agent     # where the money went
gsd-fresh                         # which code-graph indexes are stale
```

## 2. Model routing

`~/.gsd/defaults.json` maps GSD's three tiers to real models — reasoning on the
expensive one, execution on the fast one, and **a different family for the
checkers**, so the plan-check can disagree with the planner:

```json
{
  "runtime": "opencode",
  "model_profile": "balanced",
  "model_profile_overrides": {
    "opencode": {
      "opus": "opencode/deepseek-v4-pro",
      "sonnet": "opencode/deepseek-v4.1-flash",
      "haiku": "opencode/claude-haiku-5-5"
    }
  },
  "effort": { "routing_tier_defaults": { "heavy": "high" } }
}
```

Then rebake the agent frontmatter and verify it landed:

```bash
"$(npm prefix -g)/bin/gsd-core" -g --opencode
for f in ~/.config/opencode/agents/gsd-*.md; do
  printf '%-34s %s\n' "$(basename "$f" .md)" "$(grep -m1 '^model:' "$f" | cut -d' ' -f2-)"
done
```

The three traps that silently break this — profile-only settings ignored at
bake, overrides not filtered by runtime, `heavy → xhigh` rejected by DeepSeek —
are in [model routing](model-routing.md).

## 3. Once per repo

```bash
cd <your-repo>
agent-rules INT main --hooks                  # Linear, team INT, integration branch main
agent-rules --tracker outline                 # tracked in Outline: no id in branches
agent-rules --tracker none                    # personal repo: no tickets at all
```

It writes `docs/rules/` (delivery, GSD, testing, engineering, deployment,
language, security, how an agent works, and how the repos of one product relate),
fills in your ticket prefix and integration branch, and with `--hooks` installs
the `commit-msg` hook that reads the ticket from the branch, writes it at the end
of the subject and refuses a phase-number scope. An existing hook is never
overwritten: diff it, then add `--force` when you have taken what it did.

Then point `AGENTS.md` at the index — one section, once:

```markdown
## Agent rules

Delivery, GSD, testing, language and security rules: [docs/rules/index.md](docs/rules/index.md).
Read it before your first branch or commit.
```

Or load it always and skip the pointer, in `opencode.json`:

```json
{ "instructions": ["AGENTS.md", "docs/rules/index.md"] }
```

Rules are installed as **files in the repo**, never as a URL: see
[why below](#why-the-rules-are-files-not-a-link).

## 4. The daily loop

```bash
gsd-usage                      # what today cost, by model and agent
gsd-usage --days 30 --by-agent # whether the routing still holds
gsd-recall "quota enforcement" # what was decided, and why, verbatim
gsd-fresh                      # reindex what the graph reports stale
gsd-credits                    # switch subscription ↔ pay-per-token, then rebake
gsd-compact-all ~/Projects     # turn on compact artifacts across projects
```

`gsd-usage` first: it tells you which of the others you actually need.

## 5. The site

The docs pages are published by GitHub Pages from this repo:
**Settings → Pages → source "Deploy from a branch", branch `main`, folder
`/docs`**. There is no workflow and no build step to maintain: pushing a Markdown
file to `docs/` publishes it. The URL is
<https://sbillion.github.io/agent-toolkit/>.

A page appears in the navigation only when it is listed in
`docs/_config.yml` → `header_pages`. Front matter needs `layout: default` and a
`title`; the theme is `minima`.

Preview locally before pushing:

```bash
docker run --rm -v "$PWD/docs:/srv/jekyll" -p 4000:4000 \
  jekyll/jekyll:latest jekyll serve --watch
```

Then push to `main` and check the page after the Pages build finishes
(`gh api repos/SBillion/agent-toolkit/pages --jq .status`).

## Why the rules are files, not a link

An `AGENTS.md` that points at the Pages site looks tidy and fails in practice:

- the agent does not follow a link on its own — it must decide to fetch, and
  many runtimes have no network access at all;
- a fetch costs a turn, fails offline and can lag `main` by minutes;
- a local file is greppable, diffable, and travels with the branch that changed
  the rule.

Publish the rules for humans; keep the copy the agent reads in the repo. If you
want one source, generate the page **from** the file — never the other way.
