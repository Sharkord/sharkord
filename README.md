<div align="center">
  <h1>Sharkord</h1>
  <p><strong>A lightweight, self-hosted real-time communication platform</strong></p>

[![Version](https://img.shields.io/github/v/release/Sharkord/sharkord)](https://github.com/Sharkord/sharkord/releases)
[![License](https://img.shields.io/github/license/Sharkord/sharkord)](LICENSE)
[![Downloads](https://img.shields.io/github/downloads/Sharkord/sharkord/total)](https://github.com/Sharkord/sharkord/releases)
[![Last Commit](https://img.shields.io/github/last-commit/Sharkord/sharkord)](https://github.com/Sharkord/sharkord/commits)

[Documentation](https://sharkord.com/docs) •
[Live Demo](https://demo.sharkord.com) •
[Desktop App](https://github.com/Sharkord/sharkord-desktop/releases/latest) •
[Supporters](#supporters)

[![ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/B0B71U3476)

</div>

> [!NOTE]
> Sharkord is in alpha. Bugs, incomplete features and breaking changes are to be expected.

Sharkord brings the most important Discord-like features to your own
infrastructure: voice, video and screen sharing, text channels and direct
messages, without the bloat or surveillance. You can run the server as a
standalone binary or in a Docker container. You have full control over your data
and infrastructure.

![Sharkord Screenshot](https://i.imgur.com/urO9vKC.png)

## Features

- **Voice channels** with video and screen sharing, over a built-in mediasoup
  SFU
- **Text channels** grouped into categories, with threads, replies, reactions,
  pins and search
- **Direct messages** between members
- **Roles and permissions**, with per-channel overrides for individual roles and
  users
- **Custom emoji**, mentions and channel references
- **Invites** with usage limits and automatic role assignment
- **File uploads** with per-user storage quotas and optional signed URLs
- **Plugins** that extend both server and client, through the
  [plugin SDK](packages/plugin-sdk)

## Running a server

### Binary

Download the binary for your platform from the
[latest release](https://github.com/Sharkord/sharkord/releases/latest):

| Platform              | File                       |
| --------------------- | -------------------------- |
| Linux x64             | `sharkord-linux-x64`       |
| Linux arm64           | `sharkord-linux-arm64`     |
| macOS (Apple Silicon) | `sharkord-macos-arm64`     |
| macOS (Intel)         | `sharkord-macos-x64`       |
| Windows x64           | `sharkord-windows-x64.exe` |

For example, on Linux x64:

```bash
curl -L https://github.com/sharkord/sharkord/releases/latest/download/sharkord-linux-x64 -o sharkord
chmod +x sharkord
./sharkord
```

### Docker

The image is available for amd64 and arm64:

```bash
docker run \
  -p 4991:4991/tcp \
  -p 40000:40000/tcp \
  -p 40000:40000/udp \
  -v ./data:/home/bun/.config/sharkord \
  --name sharkord \
  sharkord/sharkord:latest
```

Port `4991` serves the web client and the API, port `40000` (TCP and UDP)
carries voice and video.

### First launch

> [!WARNING]
> On first launch, Sharkord creates a secret token and prints it to
> the console. It is both the credential that grants owner access and the key
> your server signs every session and file URL with, so anyone who obtains it
> can take ownership **and** impersonate any account. Keep it out of logs,
> screenshots and issue reports, store it securely, and do not lose it.

Open [http://localhost:4991](http://localhost:4991) in your browser, or replace
`localhost` with the server's IP address or domain if it runs on another
machine. You can also add the server to the
[desktop app](https://github.com/Sharkord/sharkord-desktop/releases/latest).

See the [documentation](https://sharkord.com/docs) for configuration, reverse
proxies and troubleshooting.

## Contributing

Contributions are welcome. Read the [Contributing Guide](CONTRIBUTING.md) first,
and [Development](DEVELOPMENT.md) for running Sharkord locally.

## License

MIT, see [LICENSE](LICENSE).

## Acknowledgments

Built with [Bun](https://bun.sh), [tRPC](https://trpc.io),
[mediasoup](https://mediasoup.org), [Drizzle ORM](https://orm.drizzle.team),
[React](https://react.dev), [Radix UI](https://www.radix-ui.com),
[shadcn/ui](https://ui.shadcn.com) and [Tailwind CSS](https://tailwindcss.com).

## Supporters

Thanks to everyone who has supported Sharkord on
[Ko-fi](https://ko-fi.com/B0B71U3476)! These are the public supporters. A big
thank you as well to everyone who chose to support anonymously. You are not
listed here, but your support means just as much.

<a href="https://ko-fi.com/B0B71U3476"><img src="https://sharkord.com/supporters.png" alt="Sharkord supporters" /></a>

[![ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/B0B71U3476)
