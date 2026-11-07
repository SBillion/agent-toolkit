---
layout: default
title: Model routing
---

# Model routing

GSD routes every agent to a model tier. The tier names (`opus`, `sonnet`,
`haiku`) are aliases, not Anthropic models: `model_profile_overrides.<runtime>`
maps them to whatever your provider actually exposes.

## The three tiers

| Tier | Job | What to put there |
|---|---|---|
| `opus` | reasoning: planning, debugging, roadmapping, assumptions | the expensive, sharp model |
| `sonnet` | execution: writing code against a plan | the cheap, fast model |
| `haiku` | verification and cheap judgement: plan-check, code review, research | a **different family** than the other two |

The point of the third tier is not price, it is independence. A checker from the
same family shares the planner's blind spots. The measured incident: a planner
invented `/gsd-verify-phase` (a command that does not exist); the cross-family
plan-checker caught it before the executor ran.

## Measured prices (per 1M tokens)

| Model | input | output | cache read |
|---|---|---|---|
| deepseek-v4-pro | $1.74 | $3.48 | $0.145 |
| deepseek-v4.1-flash | $0.30 | $1.20 | $0.006 |
| claude-haiku-5-5 | $0.10 | $0.50 | $0.01 |
| claude-haiku-5-5 **above 100K prompt** | $0.50 | $2.50 | $0.05 |

Cached input dominates a GSD session, so the cache-read column is the one that
decides your bill. V4 Pro costs **24×** Flash per cached token.

## Configuration

`~/.gsd/defaults.json` (global) or `.planning/config.json` (per project):

```json
{
  "runtime": "opencode",
  "model_profile": "balanced",
  "models": {
    "planning": "opus",
    "discuss": "opus",
    "research": "haiku",
    "execution": "sonnet",
    "verification": "haiku"
  },
  "model_profile_overrides": {
    "opencode": {
      "opus": "opencode/deepseek-v4-pro",
      "sonnet": "opencode/deepseek-v4.1-flash",
      "haiku": "opencode/claude-haiku-5-5"
    }
  }
}
```

Then rebake the agent frontmatter:

```bash
"$(npm prefix -g)/bin/gsd-core" -g --opencode
```

## Three traps, all observed

**1. The install-time bake ignores the `models` map.** It only reads the profile
table, so `verification: haiku` silently does nothing and the verifier inherits
the execution model. Fix it with explicit per-agent overrides, which sit at the
highest precedence and are honoured by both the bake and the dispatcher:

```json
"model_overrides": {
  "gsd-verifier": "opencode/deepseek-v4.1-flash",
  "gsd-plan-checker": "opencode/claude-haiku-5-5",
  "gsd-planner": "opencode/deepseek-v4-pro"
}
```

After any change, verify the bake actually landed:

```bash
for f in ~/.config/opencode/agents/gsd-*.md; do
  printf '%-34s %s\n' "$(basename "$f" .md)" "$(grep -m1 '^model:' "$f" | cut -d' ' -f2-)"
done
```

**2. `model_overrides` is not filtered by runtime.** Unlike
`model_profile_overrides.<runtime>`, it applies whatever runtime you install. If
you later add GSD for Claude Code or Codex, it will force opencode model IDs into
those agents. Keep a script that rewrites the prefix (`gsd-credits`) and re-run
the bake.

**3. opencode 2.x has no `--variant` flag.** GSD's effort rendering still passes
it. Effort is carried as a `#variant` suffix on `--model` instead. Which variants
exist is model-specific:

| Model | accepted variants |
|---|---|
| deepseek-v4-pro | `high`, `max` |
| deepseek-v4.1-flash | `low`, `high`, `max` |
| claude-haiku-5-5 | `low`, `medium`, `high`, `xhigh`, `max` |

GSD's default ladder maps `heavy → xhigh`, which DeepSeek rejects. Set:

```json
"effort": { "routing_tier_defaults": { "heavy": "high" } }
```

Effort only affects reasoning and output tokens; input dominates cost, so `high`
is the sane default rather than `max`.

## Where each agent ended up, and why

| Agent | Tier | Reason |
|---|---|---|
| `gsd-planner`, `gsd-roadmapper`, `gsd-debugger` | pro | errors here propagate to every later step |
| `gsd-pattern-mapper`, `gsd-assumptions-analyzer`, `gsd-framework-selector` | pro | read broadly, decide once |
| `gsd-executor`, `gsd-code-fixer` | flash | follows a plan; mechanical |
| `gsd-verifier`, `gsd-integration-checker`, `gsd-*-auditor`, `gsd-intel-updater` | flash | reads files and checks claims |
| `gsd-plan-checker`, `gsd-code-reviewer`, `gsd-ui-checker` | haiku | must disagree with the planner, and be cheap enough to always run |
| `gsd-*-researcher`, `gsd-*-synthesizer` | haiku | summarisation, no judgement |

Keep `workflow.plan_bounce: true`. The checker is the cheapest guard you own.

---

Files: [`config/defaults.example.json`](https://github.com/SBillion/agent-toolkit/blob/main/config/defaults.example.json) ·
[`bin/gsd-credits`](https://github.com/SBillion/agent-toolkit/blob/main/bin/gsd-credits)
