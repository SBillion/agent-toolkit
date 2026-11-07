# GSD in a team: workspaces, workstreams, shared `.planning/`

Three different problems get confused under "GSD in a team". They have three
different answers:

| Problem | Answer |
|---|---|
| One machine, several features or repos at once | `/gsd-workspace` |
| One repo, several parallel milestone streams | `/gsd-workstreams` |
| Several people on one repo | conventions + one phase owner at a time |

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
`STATE.md` and phase artifacts. `PROJECT.md` stays shared: a workstream is a
stream of work on the same product, not a different product.

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

**Workspace or workstream?**

- Different repos → workspace.
- Same repo, one product, two streams that land in different milestones →
  workstream.
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
   the same PR as its code (on a stack layer, if the change is stacked).
3. **`STATE.md` is the only hot file.** It changes on every step. If two streams
   must share a checkout, give each its own workstream — that is exactly what
   workstreams are for.
4. **Never hand-edit a verification digest.** A `stale` status means source
   changed after the verifier ran; re-run the phase's verification gate, which
   regenerates the report and its digest.
5. **Resync before the milestone audit, not after.** `ROADMAP.md`,
   `REQUIREMENTS.md` and `STATE.md` drift from what was actually built. The
   audit should find real gaps, not bookkeeping.

## 4. Onboarding a teammate

```bash
# 1. the runtime and GSD
npx -y @opengsd/gsd-core@latest --opencode     # or --claude, --codex, …

# 2. the project's own settings
git clone <repo> && cd <repo>
cat .planning/config.json                      # runtime, profile, models

# 3. global model routing (optional, per machine)
#    ~/.gsd/defaults.json, then:
"$(npm prefix -g)/bin/gsd-core" -g --opencode
```

Read `.planning/config.json` before the first command. `model_profile: inherit`
silently disables routing — every agent runs on the same model, which is the
usual reason a fresh machine burns through a plan in a day.

Then:

```
/gsd-progress        # where the project actually is
/gsd-resume-work     # pick up the active phase
```

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
- One verification per phase, at the end of execution. Re-running it "to see"
  is the most expensive habit in the workflow — see
  [cost control](cost-control.md).
- Review with the graph, not with the diff alone: `/gsd-code-review` plus
  `gitnexus detect_changes`. A `partial: true` result is unseen, not
  unaffected.

See [GSD in a team, with Linear](gsd-team-linear.md) for the ticket, branch and
PR conventions that surround this loop.
