#!/bin/sh
set -e

# the server reads SHARKORD_DATA_PATH and falls back to ~/.config/sharkord on
# linux (apps/server/src/helpers/paths.ts). the entrypoint has to resolve the same
# path, otherwise a container that sets the variable gets one directory created and
# chowned while the app writes to another, and the app's own write fails with
# permission denied as the bun user.
DEFAULT_DATA_DIR="/home/bun/.config/sharkord"
DATA_DIR="${SHARKORD_DATA_PATH:-$DEFAULT_DATA_DIR}"

mkdir -p "$DATA_DIR"

# if we're already running as non-root (e.g. K8s securityContext, Podman rootless),
# the mount is expected to arrive owned by the right user, so just run the binary.
if [ "$(id -u)" -ne 0 ]; then
  exec /sharkord
fi

# running as root: optionally remap the bun user's UID/GID via PUID/PGID env vars
if [ -n "$PUID" ] && [ -n "$PGID" ]; then
  echo "Setting bun user to UID=$PUID GID=$PGID"

  if [ "$(getent group bun | cut -d: -f3)" != "$PGID" ]; then
    groupmod -o -g "$PGID" bun
  fi

  if [ "$(id -u bun)" != "$PUID" ]; then
    usermod -o -u "$PUID" bun
  fi
fi

# the app reads and writes its config file beside the directory it was pointed at,
# so the parent has to belong to the bun user too, not just the data directory
chown -R bun:bun "$DATA_DIR"
chown -R bun:bun "$(dirname "$DEFAULT_DATA_DIR")"

# drop privileges and exec the binary
exec su -s /bin/sh bun -c "exec /sharkord"
