FROM oven/bun:1.3.5

ARG TARGETARCH

# Install wget and curl, get latest release, download binary
RUN apt-get update && apt-get install -y wget curl jq && \
    LATEST_VERSION=$(curl -s https://api.github.com/repos/Sharkord/sharkord/releases/latest | jq -r .tag_name) && \
    if [ "$TARGETARCH" = "amd64" ]; then \
        wget -O /sharkord https://github.com/Sharkord/sharkord/releases/download/${LATEST_VERSION}/sharkord-linux-x64; \
    elif [ "$TARGETARCH" = "arm64" ]; then \
        wget -O /sharkord https://github.com/Sharkord/sharkord/releases/download/${LATEST_VERSION}/sharkord-linux-arm64; \
    fi && \
    chmod +x /sharkord && \
    apt-get remove -y wget curl jq && \
    apt-get autoremove -y && \
    rm -rf /var/lib/apt/lists/*

ENV RUNNING_IN_DOCKER=true

CMD ["/sharkord"]
