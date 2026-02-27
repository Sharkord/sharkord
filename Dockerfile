FROM oven/bun:1.3.10

ARG TARGETARCH
ENV RUNNING_IN_DOCKER=true

RUN groupadd -r sharkord && \
    useradd -r -g sharkord -m -d /home/sharkord sharkord

COPY apps/server/build/out/sharkord-linux-x64 /tmp/sharkord-linux-x64
COPY apps/server/build/out/sharkord-linux-arm64 /tmp/sharkord-linux-arm64

RUN set -eux; \
    case "$TARGETARCH" in \
      amd64)  cp /tmp/sharkord-linux-x64 /sharkord ;; \
      arm64)  cp /tmp/sharkord-linux-arm64 /sharkord ;; \
      *) echo "Unsupported arch: $TARGETARCH" >&2; exit 1 ;; \
    esac; \
    chmod +x /sharkord; \
    chown sharkord:sharkord /sharkord; \
    rm -rf /tmp/sharkord-linux-*

USER sharkord
WORKDIR /home/sharkord

CMD ["/sharkord"]