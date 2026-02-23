#!/bin/bash

if [[ -v SHARKORD_DEPENDENCIES ]]; then
    MISSING_DEPENDENCIES="";
    for dependency in $SHARKORD_DEPENDENCIES; do
        dpkg -s $dependency &>/dev/null || MISSING_DEPENDENCIES="$MISSING_DEPENDENCIES $dependency";
    done
    if [ -n "$MISSING_DEPENDENCIES" ]; then
        echo "Installing $MISSING_DEPENDENCIES";
        apt update &>/dev/null;
        apt install $MISSING_DEPENDENCIES -y;
        rm -rf /var/lib/apt/lists/*;
        apt clean;
    fi
fi

su -c /sharkord bun