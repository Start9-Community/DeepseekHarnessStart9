#!/bin/sh
# Web UI supervisor: runs `dsh web` (loopback-only by upstream design)
# plus the HTTP/WS forwarder that exposes it to StartOS on $PROXY_PORT.
# The python agent runs in its own daemon — do NOT start it here.
#
# If either child dies, exit nonzero so StartOS restarts the daemon.
# POSIX sh only.

set -u

DSH_WEB_PORT="${DSH_WEB_PORT:-4200}"
PROXY_PORT="${PROXY_PORT:-4201}"
PROJECTS_DIR="${PROJECTS_DIR:-/data/projects}"
DSH_HOME_DIR="${DSH_HOME:-/data/dsh}"
export PROXY_PORT TARGET_PORT="$DSH_WEB_PORT"

# dsh uses the invoking directory as its workspace root (process.cwd()).
mkdir -p "$PROJECTS_DIR" "$DSH_HOME_DIR"
chmod 775 "$PROJECTS_DIR" 2>/dev/null || true
cd "$PROJECTS_DIR" || { echo "[webui] cannot cd into $PROJECTS_DIR"; exit 1; }

# ── Session store repair ────────────────────────────────────────────────
# dsh requires sessions/<projectKey>/<sessionId>/session.jsonl[.zst] AND
# validates that each transcript's path matches its own header (id + cwd).
# heal-sessions.js realigns every session to the group/id its header
# declares (undoing any legacy migration) and quarantines unreadables so a
# corrupt file can never block the boot again.
node /app/heal-sessions.js

# ── trusted hosts ───────────────────────────────────────────────────────
HOSTNAME_VAL="$(hostname 2>/dev/null || echo server)"
TRUSTED="--trusted-host ${HOSTNAME_VAL}"
TRUSTED="$TRUSTED --trusted-host ${HOSTNAME_VAL}.local"
TRUSTED="$TRUSTED --trusted-host node.local"

echo "[webui] workspace: $PROJECTS_DIR (uid $(id -u))"
echo "[webui] starting dsh web on 127.0.0.1:$DSH_WEB_PORT ($TRUSTED)"
dsh web --port "$DSH_WEB_PORT" --no-open $TRUSTED &
DSH_PID=$!

echo "[webui] starting http/ws proxy on 0.0.0.0:$PROXY_PORT -> 127.0.0.1:$DSH_WEB_PORT"
node /app/web-proxy.js &
PROXY_PID=$!

trap 'kill "$DSH_PID" "$PROXY_PID" 2>/dev/null; exit 0' TERM INT

while kill -0 "$DSH_PID" 2>/dev/null && kill -0 "$PROXY_PID" 2>/dev/null; do
  sleep 1
done

echo "[webui] a child process died — exiting so StartOS restarts the daemon"
exit 1
