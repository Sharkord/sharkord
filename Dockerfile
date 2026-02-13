# Build stage
FROM oven/bun:1.3.5-debian AS builder

WORKDIR /app

# Copy everything and build
COPY . .
RUN bun install --frozen-lockfile
WORKDIR /app/apps/server
RUN bun run build

# Runtime stage - just the binary
FROM debian:bookworm-slim

RUN apt-get update && apt-get install -y \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Copy only the compiled binary
COPY --from=builder /app/apps/server/build/out/sharkord-linux-x64 /sharkord
RUN chmod +x /sharkord

ENV RUNNING_IN_DOCKER=true
ENV SHARKORD_RTC_MIN_PORT=7882
ENV SHARKORD_RTC_MAX_PORT=7882
# ENV SHARKORD_WEBRTC_HOST=webrtc.yourdomain.com

EXPOSE 4991
EXPOSE 7882/tcp
EXPOSE 7882/udp

CMD ["/sharkord"]