#!/bin/sh
# Web UI supervisor: runs `dsh web` (loopback-only by upstream design)
# plus the HTTP/WS forwarder that exposes it to StartOS on $PROXY_PORT.
# The python agent runs in its own daemon — do NOT start it here.
#
# If either child dies, exit nonzero so StartOS restarts the daemon.
# POSIX sh only (no arrays): build the trusted-host list as a string.

set -u

DSH_WEB_PORT="${DSH_WEB_PORT:-4200}"
PROXY_PORT="${PROXY_PORT:-4201}"
PROJECTS_DIR="${PROJECTS_DIR:-/data/projects}"
DSH_HOME_DIR="${DSH_HOME:-/data/dsh}"
export PROXY_PORT TARGET_PORT="$DSH_WEB_PORT"

# dsh uses the invoking directory as its workspace root (process.cwd()):
# every project the UI creates lands under /data/projects, on the
# persistent volume, owned by the service user.
mkdir -p "$PROJECTS_DIR" "$DSH_HOME_DIR"
chmod 775 "$PROJECTS_DIR" 2>/dev/null || true
cd "$PROJECTS_DIR" || { echo "[webui] cannot cd into $PROJECTS_DIR"; exit 1; }

# Repair stale session records: sessions saved with a cwd that no longer
# matches (or no longer exists) fail their history reads with an opaque
# "internal" error. dsh groups sessions by encoded project key
# (--data-projects-- for /data/projects, --root-- for /root, etc.).
# Migrate every legacy group into the current workspace's group so old
# sessions keep loading.
SESSIONS_DIR="$DSH_HOME_DIR/sessions"
CURRENT_KEY="--data-projects--"
if [ -d "$SESSIONS_DIR" ]; then
  mkdir -p "$SESSIONS_DIR/$CURRENT_KEY"
  for dir in "$SESSIONS_DIR"/*/; do
    name="$(basename "$dir")"
    [ "$name" = "_no-cwd" ] && continue
    [ "$name" = "$CURRENT_KEY" ] && continue
    # Only migrate legacy groups from earlier workspace roots.
    case "$name" in
      --root--|--app--|--~*|_no-cwd) ;; # known legacy shapes
      *) continue ;;
    esac
    echo "[webui] migrating session store '$name' -> '$CURRENT_KEY'"
    find "$dir" -type f -exec mv {} "$SESSIONS_DIR/$CURRENT_KEY/" \; 2>/dev/null || true
    rm -rf "$dir"
  done
fi

# dsh's browser-trust fence validates the Host header. StartOS exposes the
# service on a RANDOM external port, so whitelist BARE hostnames (which
# cover every port): mDNS name, container hostname, .local form. The proxy
# additionally rewrites Host to 127.0.0.1, which dsh always trusts.
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
