#!/bin/sh
# Runs `dsh web` on loopback plus the relay that exposes it to StartOS.
# If either child dies, exit nonzero so StartOS restarts the daemon.
# POSIX sh only.

set -u

DSH_WEB_PORT="${DSH_WEB_PORT:-4200}"
PROXY_PORT="${PROXY_PORT:-4201}"
PROJECTS_DIR="${PROJECTS_DIR:-/data/projects}"
# dsh prints a per-process launch token once, on stdout. The relay reads it
# from here to sign the browser in; it never touches /data or the logs.
DSH_TOKEN_FILE="${DSH_TOKEN_FILE:-/run/dsh-launch-token}"
export PROXY_PORT TARGET_PORT="$DSH_WEB_PORT" DSH_TOKEN_FILE

# dsh's workspace picker opens on $HOME, so make that the workspace root on
# the volume — left at /root, a workspace (and everything the agent wrote in
# it) would vanish on the next container rebuild.
mkdir -p "$PROJECTS_DIR" "${DSH_HOME:-/data/dsh}" "$(dirname "$DSH_TOKEN_FILE")"
export HOME="$PROJECTS_DIR"
cd "$PROJECTS_DIR" || { echo "[webui] cannot cd into $PROJECTS_DIR"; exit 1; }

# Model servers connected with the Connect Model Servers action become dsh
# provider routes (startos-*) in the profile patch the Models page edits. The
# profile is created on dsh's first boot; --dump-config creates it without
# serving. The routes carry no keys: those arrive as STARTOS_*_API_KEY env.
# dsh resolves its home from $DSH_HOME and falls back to ~/.dsh, so the default
# has to be exported too: without it dsh would write the profile under $HOME
# while this script looked for it in /data/dsh, and every route would be lost
# with only a warning in the log.
DSH_HOME="${DSH_HOME:-/data/dsh}"
export DSH_HOME
PATCH_FILE="$DSH_HOME/profiles/web/cordis.patch.yml"
[ -f "$PATCH_FILE" ] || dsh web --dump-config > /dev/null 2>&1
node /app/startos-providers.mjs "$PATCH_FILE" \
  || echo "[webui] could not add the StartOS model servers to dsh's providers"
unset STARTOS_PROVIDERS

# Word-splitting is the point: one --trusted-host per authority.
TRUSTED=""
for authority in ${DSH_TRUSTED_HOSTS:-}; do
  TRUSTED="$TRUSTED --trusted-host $authority"
done

rm -f "$DSH_TOKEN_FILE"
FIFO="$(mktemp -u /tmp/dsh-out.XXXXXX)"
mkfifo -m 600 "$FIFO" || { echo "[webui] cannot create $FIFO"; exit 1; }

# Copy dsh's output to the log, lifting the token out of the launch line.
(
  umask 077
  while IFS= read -r line; do
    case "$line" in
      *'?token='*)
        printf '%s' "$line" | sed -n 's/.*[?&]token=\([A-Za-z0-9_-]*\).*/\1/p' > "$DSH_TOKEN_FILE"
        printf '%s\n' "$line" | sed 's/\([?&]token=\)[A-Za-z0-9_-]*/\1<redacted>/g'
        ;;
      *) printf '%s\n' "$line" ;;
    esac
  done < "$FIFO"
) &
FILTER_PID=$!

echo "[webui] workspace: $PROJECTS_DIR (uid $(id -u))"
echo "[webui] starting dsh web on 127.0.0.1:$DSH_WEB_PORT${TRUSTED:+ (trusted:${DSH_TRUSTED_HOSTS})}"
# shellcheck disable=SC2086
dsh web --port "$DSH_WEB_PORT" --no-open $TRUSTED > "$FIFO" 2>&1 &
DSH_PID=$!

echo "[webui] starting http/ws relay on 0.0.0.0:$PROXY_PORT -> 127.0.0.1:$DSH_WEB_PORT"
node /app/web-proxy.js &
PROXY_PID=$!

trap 'kill "$DSH_PID" "$PROXY_PID" "$FILTER_PID" 2>/dev/null; rm -f "$FIFO"; exit 0' TERM INT

while kill -0 "$DSH_PID" 2>/dev/null && kill -0 "$PROXY_PID" 2>/dev/null; do
  sleep 1
done

echo "[webui] a child process died — exiting so StartOS restarts the daemon"
rm -f "$FIFO"
exit 1
