FROM ubuntu:22.04

COPY apps/server/build/out/sharkord-linux-x64 /sharkord

ENV RUNNING_IN_DOCKER=true

RUN chmod +x /sharkord

CMD ["/sharkord"]