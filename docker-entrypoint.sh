#!/bin/sh
set -e

# check if PUID and PGID are set, and if so, modify the bun user accordingly
# if they are not set, the bun user will run with the default UID and GID (bun user, which is usually 1000:1000)
if [ -n "$PUID" ] && [ -n "$PGID" ]; then
  echo "Setting bun user to UID=$PUID GID=$PGID"

  if [ "$(getent group bun | cut -d: -f3)" != "$PGID" ]; then
    groupmod -o -g "$PGID" bun
  fi

  if [ "$(id -u bun)" != "$PUID" ]; then
    usermod -o -u "$PUID" bun
  fi
fi

exec su bun -c "/sharkord"