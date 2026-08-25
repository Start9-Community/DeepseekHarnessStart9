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
# dsh requires: sessions/<projectKey>/<sessionId>/session.jsonl[.zst]
# Two failure shapes we heal at startup:
#  1. Legacy project groups (--root--, --app--, --~XXXX--) from earlier
#     workspace roots → move whole group under the current key.
#  2. Flat artifacts directly inside a project group (no per-session dir)
#     → read the session id from the transcript header and give each file
#       its own directory; unreadable files go to quarantine so the boot
#       never blocks.
repair_sessions() {
  SESSIONS_DIR="$DSH_HOME_DIR/sessions"
  CURRENT_KEY="--data-projects--"
  QUARANTINE="$DSH_HOME_DIR/quarantine"
  [ -d "$SESSIONS_DIR" ] || return 0

  # 1) legacy project groups -> current workspace key
  mkdir -p "$SESSIONS_DIR/$CURRENT_KEY"
  for dir in "$SESSIONS_DIR"/*/; do
    name="$(basename "$dir")"
    [ "$name" = "_no-cwd" ] && continue
    [ "$name" = "$CURRENT_KEY" ] && continue
    case "$name" in
      --root--|--app--|--~*|"_no-cwd") ;;
      *) continue ;;
    esac
    echo "[webui] migrating session group '$name' -> '$CURRENT_KEY'"
    find "$dir" -mindepth 1 -maxdepth 1 -exec mv {} "$SESSIONS_DIR/$CURRENT_KEY/" \; 2>/dev/null
    rm -rf "$dir"
  done

  # 2) flatten-heal: any session.* artifact sitting directly inside a
  #    project group must live under <groupId>/<sessionId>/ instead.
  for f in "$SESSIONS_DIR"/*/session.*; do
    [ -f "$f" ] || continue
    grp="$(dirname "$f")"
    sid=""
    case "$f" in
      *.zst|*.zstd)
        if command -v zstd >/dev/null 2>&1; then
          sid="$(zstd -dc "$f" 2>/dev/null | head -c 4096 | grep -oE '"id"[[:space:]]*:[[:space:]]*"[^"]+"' | head -1 | sed 's/.*"id"[[:space:]]*:[[:space:]]*"//; s/"$//')"
        fi
        ;;
      *)
        sid="$(head -c 4096 "$f" | grep -oE '"id"[[:space:]]*:[[:space:]]*"[^"]+"' | head -1 | sed 's/.*"id"[[:space:]]*:[[:space:]]*"//; s/"$//')"
        ;;
    esac
    if [ -n "$sid" ]; then
      safe="$(echo "$sid" | tr -c 'A-Za-z0-9._-' '_')"
      mkdir -p "$grp/$safe"
      mv "$f" "$grp/$safe/" && echo "[webui] healed flat artifact '$(basename "$f")' -> '$safe/'"
    else
      mkdir -p "$QUARANTINE"
      mv "$f" "$QUARANTINE/" && echo "[webui] quarantined unreadable artifact '$(basename "$f")'"
    fi
  done
}
repair_sessions

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
