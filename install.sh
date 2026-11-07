#!/usr/bin/env bash
# Link the commands and copy the opencode-side files without overwriting.
set -euo pipefail

here=$(cd "$(dirname "$0")" && pwd)
bin="$HOME/.local/bin"
oc="$HOME/.config/opencode"

mkdir -p "$bin"
for f in "$here"/bin/*; do
  ln -sf "$f" "$bin/$(basename "$f")"
done
echo "linked $(ls "$here/bin" | wc -l | tr -d ' ') command(s) into $bin"

mkdir -p "$oc/plugins"
for f in "$here/plugins/gitnexus-guard.ts"; do
  dest="$oc/plugins/$(basename "$f")"
  [ -e "$dest" ] && echo "kept existing $dest" || { cp "$f" "$dest"; echo "installed $dest"; }
done

for f in "$here/config/dcp.jsonc"; do
  dest="$oc/$(basename "$f")"
  [ -e "$dest" ] && echo "kept existing $dest" || { cp "$f" "$dest"; echo "installed $dest"; }
done

cat <<'EOF'

Not copied automatically — merge them by hand:
  config/opencode.jsonc          into ~/.config/opencode/opencode.jsonc
  config/defaults.example.json   into ~/.gsd/defaults.json (then rebake)
  AGENTS.md                      into ~/.config/opencode/AGENTS.md

Rebake after editing the GSD defaults:
  "$(npm prefix -g)/bin/gsd-core" -g --opencode
EOF
