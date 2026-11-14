# Deployment — by product shape

**When this applies.** Every deployed product. What a deploy *is* depends on the
shape of the product, so pick the shape first and read only the section that
matches it. Do not assume the heaviest shape: a repo with no `terraform/` and no
Ansible inventory is not a config repo, whatever its name suggests.

## Which shape is this?

| Shape | Repos | What a deploy is | Rules |
|---|---|---|---|
| **Single-repo app** | one repo: app, backend, tests | build an artefact, publish it, let the platform run it; e2e (if any) gates the environment | §Single-repo app |
| **App + e2e** | app repo, e2e repo | the app publishes; the e2e repo is the only thing that talks to a deployed environment | §Single-repo app + [`repos.md`](repos.md) |
| **App + config + e2e** | app repo, config repo owning the hosts, e2e repo | the config repo provisions the host, configures it, starts the stack and proves it | §Config repo (the rest of this file) |

The third shape is the expensive one to get wrong — it has a firewall, a shared
edge and a secret path to protect. The first two have none of that; applying its
rules to them produces ceremony with no control behind it.

## Single-repo app

- **The platform owns the runtime.** The app repo owns the artefact and how to
  rebuild it: build command, health route, migrations, the names of its env vars.
  It does not own hosts, TLS or restarts; do not invent a deploy script for what
  the platform already does.
- **A deploy is reproducible from a commit.** Pin the runtime version, commit the
  lockfile, and make the platform build from the repo rather than from a laptop.
- **Config comes from the secret manager at startup**, never baked into the
  artefact and never committed. A missing key fails the boot loudly; a key with a
  silent default ships a broken environment that looks healthy.
- **The e2e repo runs at promotion, never on a pull request** — see
  [`repos.md`](repos.md) for the contract between the two.
- **Rollback is redeploying the previous artefact**, not reverting a commit.

## Config repo (app + config split)

### Who owns what

- **App repo**: the image, its healthcheck, its migrations, its env-var names.
- **Config repo**: the hosts, the network, the reverse proxy, the compose files,
  the secrets wiring, the smoke check. It contains **no application code**.
- **E2E repo**: the only place that talks to a deployed environment, at
  promotion time — never from a pull request.
- **The image tag is the contract** between the first two: config pins a tag,
  app publishes it. A config change that needs a new tag lands with that tag.

### OpenTofu

- **Remote state, one operator at a time.** Two concurrent applies corrupt state.
  Do not assume the backend enforces that: R2/S3 has no lock table, so the real
  guard is the deploy workflow's concurrency group (and its close/rollback path).
  A local "is anything running?" pre-check is racy — say so instead of implying a
  lock that does not exist.
- `tofu fmt -check` and `tofu validate` in CI, no credentials needed. `plan` runs
  on pull requests touching the infra; `apply` only from the deploy workflow.
- **Create a resource in its right shape the first time.** Create-then-patch is
  what produces reboots and outages (a server attached to the private network
  after boot, a firewall rule added later).
- Credentials come from `TF_VAR_*`, never from a committed `*.tfvars`.

### Ansible

- `ansible-lint` (production profile) and `yamllint` gate every PR;
  `--syntax-check` runs against a fixture inventory so it needs no credentials.
- **Idempotency is the contract**: a second run reports `changed=0`. Guard
  create-once actions with an existence check; set `changed_when` (and
  `failed_when` when the exit code lies).
- FQCN everywhere (`ansible.builtin.*`); registered variables prefixed with the
  role name; tags per layer (`base`, `edge`, `db`, `app`, `verify`) so a deploy
  can scope itself with `--tags`/`--skip-tags`.
- **Never bake a secret into a task or a remote URL.** Render the secret mapping
  into a templated `.env` at deploy time; the secrets manager is the only source.
- **Never clone the private repo on the host.** The runner clones with a token
  and `copy`s the files (`remote_src: false`); a clone credential on a VPS is one
  `git remote -v` away from a leak.

### Exposure

- **Firewall default-deny.** Database on the private IP only, API on loopback,
  TLS terminated at the shared edge. Docker-published ports bypass host ufw, so
  the compose binding plus the cloud firewall rules are the control there — ufw
  is not.
- **The cloud firewall is the authoritative SSH gate, and it is closed by
  default.** The deploy allowlists its own runner IP for the run and closes it
  after. A human session uses an explicit window workflow. Never `0.0.0.0/0` on
  22. Host ufw only rate-limits it (`ufw limit 22/tcp`), so the host layer keeps a
  throttled standing rule rather than an open door.
- **Host keys verified** (`host_key_checking = True`, known hosts pinned). Do not
  disable it to get a deploy through — that is how the wrong host gets your
  playbook.
- One shared edge serves several environments; the second environment brings up
  only its own app stack with an explicit `--skip-tags` list (the base roles plus
  every role only the other environment needs), never a second stack. A short
  list silently re-runs shared roles on the same box.

## A deploy — all shapes

- **Runs from the integration branch only**, never triggered by a pull request.
  A production environment sits behind an approval when the shape has a config
  repo to gate.
- **A deploy that "ran" but left the site down is a failed deploy.** In the
  config shape it ends with two checks, not one: `smoke` is the last Ansible
  step — the API answers its health route, the database accepts connections, the
  public URL serves the page — then, after the firewall closes, an **external**
  probe from the runner proves port 22 refuses or times out on every host. A
  check running on the host it just configured cannot prove the box is
  unreachable from outside. In the single-repo shape the platform healthcheck is
  that check; do not add a second one that only repeats it.
- **Rollback is redeploying the previous artefact** — documented, and possible
  without a new commit.
- **Environments differ only in their values**, never in behaviour. A behaviour
  that exists only in one environment is a bug found in the other.
