#!/usr/bin/env bash

# GET INITIAL OWNER TOKEN
# docker logs -f sharkord

# MAGIC RESET VOLUMES LINE
# rm -rf data && docker system prune -a --volumes

# convenience wrapper for prod builds
SHARKORD_AUTOUPDATE=false docker compose --profile prod down && docker compose --profile prod up --build -d

# build flow
## copy current code
## bun install
## build
## create caddy certs