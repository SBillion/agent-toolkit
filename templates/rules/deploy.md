# Deployment — config + e2e with OpenTofu and Ansible

**When this applies.** Products that split into an app repo, a config repo that
owns the infrastructure, and sometimes an e2e repo that gates a deployed
environment. A single-repo product deploys with the section on images in
[`engineering.md`](engineering.md) and stops there.

## Who owns what

- **App repo**: the image, its healthcheck, its migrations, its env-var names.
- **Config repo**: the hosts, the network, the reverse proxy, the compose files,
  the secrets wiring, the smoke check. It contains **no application code**.
- **E2E repo**: the only place that talks to a deployed environment, at
  promotion time — never from a pull request.
- **The image tag is the contract** between the first two: config pins a tag,
  app publishes it. A config change that needs a new tag lands with that tag.

## OpenTofu

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

## Ansible

- `ansible-lint` (production profile) and `yamllint` gate every PR;
  `--syntax-check` runs against a fixture inventory so it needs no credentials.
- **Idempotency is the contract**: a second run reports `changed=0`. Guard
  create-once actions with an existence check; set `changed_when` (and
  `failed_when` when the exit code lies).
- FQCN everywhere (`ansible.builtin.*`); registered variables prefixed with the
  role name; tags per layer (`base`, `edge`, `db`, `app`, `verify`) so a deploy
  can scope itself with `--tags`/`--skip-tags`.
- **Never bake a secret into a task or a remote URL.** Render `app_secrets` into
  a templated `.env` at deploy time; the secrets manager is the only source.
- **Never clone the private repo on the host.** The runner clones with a token
  and `copy`s the files (`remote_src: false`); a clone credential on a VPS is one
  `git remote -v` away from a leak.

## Exposure

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

## A deploy

- **Runs from the integration branch only**, behind an environment approval for
  production; it is never triggered by a pull request.
- **Ends with two checks, not one.** `smoke` is the last Ansible step — the API
  answers its health route, the database accepts connections, the public URL
  serves the page. After the firewall closes, an **external** probe from the
  runner proves port 22 refuses or times out on every host: a check running on
  the host it just configured cannot prove the box is unreachable from outside.
  A deploy that "ran" but left the site down is a failed deploy.
- **Rollback is redeploying the previous tag** — documented, and possible without
  a new commit.
- Environments differ only in `envs/<env>/`; dev mirrors prod (same tokens
  shape, same DB server). A behaviour that exists only in dev is a bug found in
  production.
