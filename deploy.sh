#!/usr/bin/env bash
set -Eeuo pipefail

SSH_TARGET="${SSH_TARGET:-manabi}"
REMOTE_ROOT="${REMOTE_ROOT:-/opt/nhg-manabi}"
SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
STAMP="$(date +%Y%m%dT%H%M%S)"
RELEASE="$REMOTE_ROOT/admin/releases/$STAMP"

echo "[1/5] Building admin"
cd "$SCRIPT_DIR"
vp run build

echo "[2/5] Uploading release $STAMP"
ssh "$SSH_TARGET" "mkdir -p '$RELEASE'"
rsync -az --delete --exclude '.DS_Store' --exclude '._*' "$SCRIPT_DIR/dist/" "$SSH_TARGET:$RELEASE/"

echo "[3/5] Activating release"
ssh "$SSH_TARGET" "ln -sfn '$RELEASE' '$REMOTE_ROOT/admin/current'"

echo "[4/5] Validating and reloading Nginx"
rsync -az "$SCRIPT_DIR/deploy/nginx.conf" "$SSH_TARGET:$REMOTE_ROOT/admin/nginx.conf"
ssh "$SSH_TARGET" "install -m 0644 '$REMOTE_ROOT/admin/nginx.conf' /etc/nginx/sites-available/nhg-manabi-admin && ln -sfn /etc/nginx/sites-available/nhg-manabi-admin /etc/nginx/sites-enabled/nhg-manabi-admin && rm -f /etc/nginx/sites-enabled/japanese-study-admin && nginx -t && systemctl reload nginx"

echo "[5/5] Verifying admin"
curl -fsS --retry 10 --retry-delay 2 https://admin.manabi.cc/ >/dev/null
echo "Admin deployed successfully: $RELEASE"
