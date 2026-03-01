FROM sharkord/sharkord:latest

USER root

RUN apt-get update && apt-get install -y --no-install-recommends gosu && \
    rm -rf /var/lib/apt/lists/*

RUN mkdir -p /home/bun/.config/sharkord/uploads && \
    chown -R bun:bun /home/bun/.config/sharkord

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

WORKDIR /home/bun

ENTRYPOINT ["/entrypoint.sh"]
