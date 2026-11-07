---
layout: default
title: gitnexus
---

# gitnexus: give the model the graph, not the files

`gitnexus` indexes a repository into a symbol graph and exposes `impact`,
`context`, `query` and `detect_changes` over MCP. A targeted query costs a few
hundred tokens; reading the files it would have taken to answer the same question
costs thousands.

## The failure mode

The index is a snapshot. If it was built three weeks ago, it answers confidently
about code that no longer exists — and the model has no way to tell. On a repo
with ~8 500 symbols, the stale index had 4 651 nodes against 8 497 real ones.

**Check before trusting it:**

```bash
python3 -c 'import json;print(json.load(open(".gitnexus/meta.json"))["lastCommit"])'
git rev-parse HEAD
```

Equal, or reindex:

```bash
node .gitnexus/run.cjs analyze --index-only
```

`.gitnexus/meta.json` is mostly a `fileHashes` map — never `cat` it, it runs to
thousands of lines. The fields you want are `lastCommit` and `stats.nodes`.

## Keeping it fresh

```bash
gsd-fresh          # ok / STALE per repo
gsd-fresh --fix    # reindex the stale ones
```

It walks `$HOME` to depth 5, pruning `Library`, `node_modules`, `.npm`, `.cache`,
`.cargo`, `.config`, `.local`, `.Trash` and `.git`. A full scan of a home
directory with a dozen repos takes ~2 s.

Schedule it (macOS, daily at 09:00):

```bash
cat > ~/Library/LaunchAgents/com.seb.gsd-fresh.plist <<'PLIST'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>Label</key><string>com.seb.gsd-fresh</string>
  <key>ProgramArguments</key>
  <array><string>/bin/bash</string><string>-lc</string><string>$HOME/.local/bin/gsd-fresh --fix</string></array>
  <key>StartCalendarInterval</key><dict><key>Hour</key><integer>9</integer><key>Minute</key><integer>0</integer></dict>
  <key>StandardOutPath</key><string>/Users/seb/Library/Logs/gsd-fresh.log</string>
  <key>StandardErrorPath</key><string>/Users/seb/Library/Logs/gsd-fresh.log</string>
</dict></plist>
PLIST
launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.seb.gsd-fresh.plist
```

## Making it actually used

An instruction in `AGENTS.md` is advisory; a model under time pressure skips it.
`plugins/gitnexus-guard.ts` makes it structural: the first edit to an existing
code file in a session is refused until a gitnexus tool has run.

It fails open on purpose:

- only `edit`/`write`/`patch`/`multiedit`, only existing code files;
- only repos that already contain `.gitnexus/meta.json`;
- only above **1 000 nodes** — below that a text search is cheaper than a query;
- never for `gsd-*` subagents, `explore` or `general`, which may not carry the MCP
  tools (blocking them would deadlock a phase).

When it blocks, it says exactly what to call:

```
gitnexus guard: <file> is in an indexed repo and no graph query has run this session.
Call gitnexus_impact (direction "upstream") on the symbol you are about to change,
or gitnexus_context for its callers, then retry the edit.
```

## Interpreting the results

- `impact ... direction: "upstream"` — who calls this, and how risky is a change.
- `risk: UNKNOWN` — **not** an all-clear. It means the walk could not answer;
  confirm with a text search before changing or deleting the symbol.
- `context` — one symbol's definition, callers and callees.
- `query` — a concept or flow, in plain language.

---

Files: [`plugins/gitnexus-guard.ts`](https://github.com/SBillion/agent-toolkit/blob/main/plugins/gitnexus-guard.ts) ·
[`bin/gsd-fresh`](https://github.com/SBillion/agent-toolkit/blob/main/bin/gsd-fresh) ·
[`AGENTS.md`](https://github.com/SBillion/agent-toolkit/blob/main/AGENTS.md)
