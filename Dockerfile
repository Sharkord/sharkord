FROM sharkord/sharkord:latest

USER root

USER root

COPY apps/server/build/out/sharkord-linux-x64 /tmp/sharkord-linux-x64
COPY apps/server/build/out/sharkord-linux-arm64 /tmp/sharkord-linux-arm64

RUN mkdir -p /home/bun/.config/sharkord/uploads && \
    chown -R bun:bun /home/bun/.config/sharkord

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

COPY docker-entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

WORKDIR /home/bun

ENTRYPOINT ["/entrypoint.sh"]
