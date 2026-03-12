#!/bin/bash

find . -name "node_modules" -type d -prune | while read dir; do
  echo "Removing $dir"
  rm -rf "$dir"
done

echo "Done."