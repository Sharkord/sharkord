#!/bin/sh
set -e

DATA_DIR="/home/bun/.config/sharkord"

# if we're already running as non-root (e.g. K8s securityContext, Podman rootless),
# just ensure the data directory exists and run the binary directly.
if [ "$(id -u)" -ne 0 ]; then
  mkdir -p "$DATA_DIR"
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

# ensure the data directory exists and is owned by the bun user
mkdir -p "$DATA_DIR"
chown -R bun:bun /home/bun/.config

# drop privileges and exec the binary
exec su -s /bin/sh bun -c "exec /sharkord"
