# Tool routing (global)

## Code structure — `gitnexus` MCP

Before editing a function, class or method, call `impact` with `direction: "upstream"`.
Report callers and risk. If it returns `risk: UNKNOWN`, confirm with a text search
before changing or deleting the symbol.

- `context` — one symbol: definition, callers, callees.
- `query` — a concept or flow in plain language.
- Text search is the fallback, not the first move.

The index must be current: if `.gitnexus/meta.json` → `lastCommit` differs from
`git rev-parse HEAD`, reindex before trusting any answer:

```bash
node .gitnexus/run.cjs analyze --index-only
```

No `.gitnexus/` directory means the repo is not indexed — say so and use text search.

The guard plugin enforces this only in repos above 1 000 graph nodes — below that,
text search is cheaper than the graph. `gsd-fresh` lists stale indexes.

## Past decisions — `gsd-recall`

When the question is "why is it like this", "what did we decide", "what went wrong
last time", search past sessions before reading code:

```bash
gsd-recall "quota enforcement" --days 60
gsd-recall "sentry" --all --project letmegetin
```

It greps every message of every past session in this project. Skip it for pure
code structure — that is gitnexus.

## Scale

All three are cheap: a query is a few hundred tokens, a full file read is thousands.
Prefer three targeted queries over one broad file read.
