#!/bin/sh
set -e
chown -R bun:bun /home/bun/.config/sharkord

exec gosu bun /sharkord "$@"
