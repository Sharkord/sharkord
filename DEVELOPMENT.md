# Development

## Requirements

- [Bun](https://bun.sh/)
- [Tmux](https://github.com/tmux/tmux) (optional)

## Setup

1. Clone the repository.
2. Run `bun install`.
3. Start the app:
   - With tmux: `./start.sh`
   - Without tmux: run `bun dev` in both `apps/client` and `apps/server`

Development data is stored in `apps/server/data`, including the database and uploaded files.
Delete that folder if you want a clean reset.

## Desktop app

`apps/desktop` is an Electron shell with a server rail. Each server is loaded from its own
host in an isolated session, so it always runs the client version that server ships.

```bash
cd apps/desktop
bun dev
```

Servers added in the app are stored in the Electron user data folder as `servers.json`. If
Electron says it failed to install, run `node install.js` inside its package folder to
download the binary.

### Versions and releases

The desktop app has its own version in `apps/desktop/package.json`. A server release does
not touch it, and a desktop release does not touch the server's.

Desktop releases run from the **Desktop Release** workflow. It builds Linux, Windows and
macOS on their own runners and publishes a draft release to
[Sharkord/sharkord-desktop](https://github.com/Sharkord/sharkord-desktop), then tags this
repo with `desktop-v<version>`. Publish the draft to ship it, installed apps pick it up
through their auto updater. Desktop releases cannot live in this repo: the server updater
installs whatever the latest release here is.

The desktop app and a server's client only work together when their
`DESKTOP_BRIDGE_VERSION` (`packages/shared/src/desktop.ts`) matches, otherwise that server
runs as a plain website in the app. When a change bumps it, release the desktop app
**before** the server release that carries the matching client, so users already have the
new app when their server updates.

## Mock data

To start from a server that looks used rather than empty, stop the dev server and run:

```bash
cd apps/server
bun run seed:mock
```

It **wipes `apps/server/data`** and rebuilds it: users, roles, categories, text and voice
channels, a private channel, messages spread over weeks with replies, threads, reactions and
pins, plus a few direct messages. Log in as `admin` with `password123`; every mock user shares
that password, and `useToken("dev")` still claims ownership.

It also creates a `#counting` channel holding 10,000 messages numbered `0` to `9999`, oldest
first, so scrolling, pagination and jump-to-message can be checked against a message that says
exactly where you are. Authors and timestamps alternate between runs of the same person seconds
apart, which the client draws as one group, and switches or longer gaps, which it draws
separately.

`--size small|medium|large` changes the volume (large is 25k messages, for pagination and
search), `--seed <number>` changes the cast, and `--counting <n>` resizes the numbered channel
(`0` skips it). The same seed always produces the same server.

## Testing

To run tests, use the following command:

```bash
bun run test
```

(if you only run `bun test` it's gonna fail, you NEED to run `bun run test`)

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on how to contribute to this project.
