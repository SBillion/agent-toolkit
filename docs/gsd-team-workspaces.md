---
layout: default
title: Workspaces and workstreams
---

# GSD in a team: workspaces, workstreams, shared `.planning/`

Three different problems get confused under "GSD in a team". They have three
different answers:

| Problem | Answer |
|---|---|
| One machine, several features or repos at once | `/gsd-workspace` |
| One repo, several parallel milestone streams | `/gsd-workstreams` |
| Two people, two milestones, one repo | workstreams + committed `.planning/` |
| Several people on one repo, same milestone | conventions + one phase owner at a time |

If you only want a second checkout of the same branch, use `git worktree`. None
of the below is needed, and none of it makes two checkouts share planning state.

## 1. Workspaces — isolate a whole feature across repos

A workspace is a directory with git worktrees (or clones) of one or more repos
and **its own independent `.planning/`**. Nothing you plan there touches the
planning of the source checkout.

```bash
/gsd-workspace --new --name billing-v2 --repos api,web --strategy worktree
/gsd-workspace --list
/gsd-workspace --remove billing-v2
```

Defaults: base `~/gsd-workspaces/`, target
`~/gsd-workspaces/<name>/<repo>`, branch `workspace/<name>`.
Flags: `--path`, `--branch`, `--auto` (requires `--repos`).

**`worktree` vs `clone`**

| | worktree | clone |
|---|---|---|
| disk | shares `.git` objects | full copy |
| speed | instant | minutes on a large repo |
| isolation | branch-per-worktree, same remote | fully independent |
| when | the normal case | you need a different remote, or a throwaway experiment |

Worktrees are tied to the machine and the source repo: never copy
`~/gsd-workspaces/` into a repo, a backup or a container image.

**When to use it**

- the feature spans several repos and you want one `.planning/` for all of them;
- you want to leave `main` (and your current branch) untouched while GSD runs;
- you want to throw the whole thing away with one `rm -rf`.

**When not to**: a single-repo change on one branch. A worktree plus a normal
branch is simpler and the phase artifacts stay next to the code.

## 2. Workstreams — parallel milestones in one repo

A workstream lives *inside* `.planning/workstreams/<name>/` and carries its own
`STATE.md`, `ROADMAP.md`, `REQUIREMENTS.md` and phase artifacts. `PROJECT.md`
stays shared: a workstream is a stream of work on the same product, not a
different product.

```
.planning/
├── PROJECT.md            # shared
├── config.json           # shared
├── milestones/           # shared — archived milestones and completed workstreams
├── codebase/             # shared
├── active-workstream     # shared marker, inherited only by sessions with no pointer
└── workstreams/<name>/
    ├── STATE.md
    ├── ROADMAP.md
    ├── REQUIREMENTS.md
    └── phases/
```

```bash
/gsd-workstreams create retention
/gsd-workstreams switch retention
/gsd-workstreams list
/gsd-workstreams progress
/gsd-workstreams complete retention   # archives to milestones/
/gsd-workstreams resume retention
```

Every other command accepts `--ws <name>`:

```bash
/gsd-new-milestone --ws retention
/gsd-plan-phase 3 --ws retention
/gsd-execute-phase 3 --ws retention
```

Resolution order is **`--ws` > `GSD_WORKSTREAM` env > stored active pointer**.

The pointer is stored **per session** where the runtime exposes a session id
(`OPENCODE_SESSION_ID`, `CLAUDE_CODE_SESSION_ID`, `CODEX_THREAD_ID`, tmux pane,
…). Two terminals working on two workstreams do not overwrite each other's
`STATE.md`. Where no session identity exists, the pointer is shared — then run
one workstream at a time, or pass `--ws` explicitly on every command.

**Adopting it mid-milestone.** On a flat project the first `create` also
migrates: it moves the current `ROADMAP.md`, `STATE.md`, `REQUIREMENTS.md` and
`phases/` into a workstream named after the current milestone (or `default`),
then creates the stream you named, empty. Run `workstream list` after that first
call — that is the migration, not the new stream. Later `create` calls only add
an empty stream.

**`complete` archives, it does not delete.** The whole workstream directory moves
to `.planning/milestones/ws-<name>-<YYYY-MM-DD>/`; shared files stay where they
are. Completing the last workstream returns the repo to flat mode with no active
roadmap, so open the next milestone there, never in the archive.

**Milestone and workstream are not the same unit.** A workstream runs its
milestones one after another: `/gsd-new-milestone --ws <name>` opens the next,
the milestone audit closes it, and the shared `.planning/milestones/` keeps the
archive. Complete the workstream only when no milestone is left in it — that
moves the whole directory out, roadmap included.

**Workstreams isolate state, not source.** Both streams still edit one working
tree. With `git.branching_strategy: none` nothing separates them at all: give
each stream its own branch (or stack layer) and disjoint file scopes, and
serialize the phases that touch the same modules. If two streams need the same
files at the same moment, they are one stream.

**Two streams cost two streams.** Planning, execution and verification are paid
twice and share no cache; the bill is the same as running the phases one after
the other. Parallelism buys latency, not savings — see
[cost control](cost-control.md).

**Workspace or workstream?**

- Different repos → workspace.
- Same repo, one product, two streams that land in different milestones →
  workstream.
- Same repo, two people, two milestones → workstreams **and** `.planning/` in
  git; without the commit each machine runs its own private planning.
- Same repo and you just want a branch → neither. Branch as usual.

## 3. Several people, one repo

GSD has no locking and no server. Concurrency is solved by ownership, not by
tooling. The rules that hold up:

1. **One phase, one owner.** Two people executing the same phase will both
   rewrite `STATE.md`, `ROADMAP.md` and the verification digest, and the merge
   will be wrong in ways no linter catches. Split the *phases*, or split the
   tickets inside a phase and let one person run the gate.
2. **Commit `.planning/` with the code.** It is the contract: the roadmap, the
   requirements, the verification report. A phase's `.planning/` commits ride in
   the same PR as its code (on a stack layer, if the change is stacked). An
   untracked `.planning/` — listed in `.git/info/exclude`, or `commit_docs:
   false` — makes workstreams a one-machine feature: `git worktree add` and
   `git clone` start with no `.planning/` at all, so a teammate or a second
   checkout sees a flat project and plans over the same phases. Keep
   `commit_docs: true` the moment two people or two machines work in parallel.
3. **`STATE.md` is the only hot file.** It changes on every step. If two streams
   must share a checkout, give each its own workstream — that is exactly what
   workstreams are for.
4. **Never hand-edit a verification digest.** A `stale` status means source
   changed after the verifier ran; re-run the phase's verification gate, which
   regenerates the report and its digest.
5. **Resync before the milestone audit, not after.** `ROADMAP.md`,
   `REQUIREMENTS.md` and `STATE.md` drift from what was actually built. The
   audit should find real gaps, not bookkeeping.
6. **Pin one GSD release for the whole team.** The artifact shapes in
   `STATE.md`, `config.json` and `state.json` move between releases; two
   versions on one branch produce state neither can read. Write the version in
   the repo's bootstrap notes and upgrade it in one PR, not per machine.

## 4. Onboarding a teammate

```bash
# 1. the runtime and GSD
npx -y @opengsd/gsd-core@latest --opencode     # or --claude, --codex, …

# 2. the project's own settings
git clone <repo> && cd <repo>
cat .planning/config.json                      # runtime, profile, models, commit_docs

# 3. global model routing (optional, per machine)
#    ~/.gsd/defaults.json, then:
"$(npm prefix -g)/bin/gsd-core" -g --opencode
```

Read `.planning/config.json` before the first command. `model_profile: inherit`
silently disables routing — every agent runs on the same model, which is the
usual reason a fresh machine burns through a plan in a day.

Then:

```
/gsd-progress            # where the project actually is
/gsd-workstreams list    # which streams exist, and which one is yours
/gsd-resume-work         # pick up the active phase
```

When workstreams are in play, select yours with `--ws` or `GSD_WORKSTREAM` on
every command. `.planning/active-workstream` is only the fallback for a session
with no identity of its own; never treat it as the selector while two sessions
run.

**Do not copy `~/.gsd/defaults.json` from someone else.** Its `model_overrides`
are not filtered by runtime: a Claude-routed file on an opencode machine forces
model IDs that do not exist. Take `config/defaults.example.json` from this repo
and adapt the IDs.

## 5. The team loop

```
ticket in Linear  →  branch INT-<n>-<slug>  →  /gsd-plan-phase N
                  →  /gsd-execute-phase N   →  PR (verification attached)
                  →  review                 →  human merges
```

- The ticket id is in the branch, the commit subject and the PR title;
  `Closes INT-<n>` in the body.
- `git.branching_strategy: none` means GSD will not create a branch for you:
  open the stack layer first, then run the phase.
- One phase at a time **per workstream**. Two streams running phases in the same
  checkout still share the build, the test suite and the lockfile.
- One verification per phase, at the end of execution. Re-running it "to see"
  is the most expensive habit in the workflow — see
  [cost control](cost-control.md).
- Review with the graph, not with the diff alone: `/gsd-code-review` plus
  `gitnexus detect_changes`. A `partial: true` result is unseen, not
  unaffected.

See [GSD in a team, with Linear](gsd-team-linear.md) for the ticket, branch and
PR conventions that surround this loop.
