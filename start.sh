#!/usr/bin/env bash

# GET INITIAL OWNER TOKEN
# docker logs -f sharkord

# MAGIC RESET VOLUMES LINE
# rm -rf data && docker system prune -a --volumes

# convenience wrapper for prod builds
SHARKORD_AUTOUPDATE=false docker compose --profile prod down && docker compose --profile prod up --build -d #--no-cache

#### NOTES

# Allow embeds on client side (but requires a click on an arrow facing down) DONE
# User the username provided as the original username (Not SharkordUser) DONE
# Search in server text channels DONE
# Direct replies 
# Fix whiteboard lines should just be point a click, point b click. 