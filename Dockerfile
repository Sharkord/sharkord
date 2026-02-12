FROM oven/bun:1.3.5

ARG TARGETARCH

COPY apps/server/build/out/sharkord-linux-arm64 /tmp/sharkord-linux-arm64
COPY apps/server/build/out/sharkord-linux-x64   /tmp/sharkord-linux-x64

RUN set -eux; \
    if [ "$TARGETARCH" = "arm64" ]; then \
      cp /tmp/sharkord-linux-arm64 /sharkord; \
    elif [ "$TARGETARCH" = "amd64" ]; then \
      cp /tmp/sharkord-linux-x64 /sharkord; \
    else \
      echo "Unsupported arch: $TARGETARCH" >&2; exit 1; \
    fi; \
    chmod +x /sharkordCOPY apps/server/build/out/sharkord-linux-x64 /sharkord

ENV RUNNING_IN_DOCKER=true

RUN chmod +x /sharkord

CMD ["/sharkord"]