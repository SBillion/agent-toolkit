# Cost control

A GSD session re-sends its whole context on every step. On a long phase that is
300–400 K cached tokens per message, and cached input is what you pay for — not
the model's intelligence.

Measured on one machine, one week:

| Day | Total | Notes |
|---|---|---|
| Nov 3 | $34.67 | everything on the execution model, no routing |
| Nov 4 | $27.27 | same |
| Nov 5 | $32.18 | same |
| Nov 6 | $49.43 | routing added at noon, then 18 verification runs |
| Nov 7 | $14.60 | one verification, routing stable |

Same work, same project. The difference is not a better model, it is fewer
redundant passes.

## Rule 1 — one verification per phase

`/gsd-execute-phase` ends at the verification gate. Re-running it to "see" walks
the phase again from the top.

```
18 verifier sessions in one evening : $3.39
 2 verifier messages, one per phase : $0.02
```

The verifier itself is not expensive. Running it eighteen times is.

## Rule 2 — never let a prompt cross 100 K on Haiku

Haiku 5.5 doubles its price at 100 K prompt tokens and **quintuples** the cached
read ($0.01 → $0.05/M). In a measured week, 738 of 1 282 Haiku calls were above
the line, and they accounted for most of the Haiku spend. A verifier that reads
the whole phase is exactly the shape that trips it.

Either keep Haiku for short checks (a plan file, a diff) and put the long readers
on Flash, or accept the 5× tier knowingly. Do not leave it to chance.

## Rule 3 — cap tool output

opencode injects tool output into the context, and the context is resent at every
subsequent step. One 2 000-line `git diff` early in a session is paid for dozens
of times.

```jsonc
"tool_output": { "max_lines": 800, "max_bytes": 32768 }
```

The full output is still written to disk by opencode; the model can re-read the
part it needs.

## Rule 4 — prune what is already dead

[Dynamic Context Pruning](https://github.com/Opencode-DCP/opencode-dynamic-context-pruning)
drops stale tool output, duplicates and old errors as the session grows:

```bash
opencode plugin @tarquinen/opencode-dcp@latest --global
```

Start conservative so it never cuts a GSD workflow instruction mid-run:

```jsonc
{
  "enabled": true,
  "compress": { "mode": "range", "permission": "allow",
                "maxContextLimit": 150000, "minContextLimit": 100000,
                "nudgeFrequency": 5 },
  "strategies": { "deduplication": { "enabled": true },
                  "purgeErrors": { "enabled": true, "turns": 4 } }
}
```

## Rule 5 — one session, one task

The largest single line in the measured week was the interactive `build` session
itself ($5.84/day, 585 messages, 280 M cached). No setting fixes that: a session
that spans a whole day re-reads a whole day of context. Start a new one per task.

## Other levers

| Lever | Where | Effect |
|---|---|---|
| `workflow.compact_content` | `.planning/config.json` | writes compact artifacts, smaller re-reads |
| `workflow.plan_chunked` | `.planning/config.json` | plans in slices instead of one huge prompt |
| `workflow.context_guard_mode` | `.planning/config.json` | `auto` pauses the agent before it overflows |
| `review.max_prompt_tokens` | `.planning/config.json` | caps the review lane's prompt |
| `/gsd-quick` | instead of a phase | a small task costs cents, not dollars |

## Measuring

```bash
gsd-usage --days 7 --by-agent
```

It reads `~/.local/share/opencode/opencode.db` (`session_message` joined to
`session_v2`) and prices each message at list rates, including the Haiku tier.
The `cost` column in the database is not reliable for this — it reflects the
discount of the plan you are on, not the usage you are burning.
