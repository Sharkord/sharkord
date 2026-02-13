FROM oven/bun:1.3.5 AS binary-selector

ARG TARGETARCH=amd64

COPY apps/server/build/out/sharkord-linux-arm64 /tmp/sharkord-linux-arm64
COPY apps/server/build/out/sharkord-linux-x64 /tmp/sharkord-linux-x64

RUN set -eux; \
    arch="${TARGETARCH:-amd64}"; \
    if [ "$arch" = "arm64" ]; then \
      cp /tmp/sharkord-linux-arm64 /sharkord; \
    elif [ "$arch" = "amd64" ]; then \
      cp /tmp/sharkord-linux-x64 /sharkord; \
    else \
      echo "Unsupported arch: $arch" >&2; exit 1; \
    fi; \
    chmod +x /sharkord

FROM oven/bun:1.3.5

ENV RUNNING_IN_DOCKER=true

COPY --from=binary-selector /sharkord /sharkord

CMD ["/sharkord"]
