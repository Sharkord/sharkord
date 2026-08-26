<div align="center">
  <h1>Sharkord</h1>
  <p><strong>A lightweight, self-hosted real-time communication platform</strong></p>
  
  [![Version](https://img.shields.io/github/v/release/Sharkord/sharkord)](https://github.com/Sharkord/sharkord/releases)
  [![License](https://img.shields.io/github/license/Sharkord/sharkord)](LICENSE)
  [![Downloads](https://img.shields.io/github/downloads/Sharkord/sharkord/total)](https://github.com/Sharkord/sharkord/releases)
  [![Last Commit](https://img.shields.io/github/last-commit/Sharkord/sharkord)](https://github.com/Sharkord/sharkord/commits)
  
  [![Bun](https://img.shields.io/badge/Bun-v1.3.14-green.svg)](https://bun.sh)
  [![Mediasoup](https://img.shields.io/badge/Mediasoup-v3.19.19-green.svg)](https://mediasoup.org)
</div>

[![ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/B0B71U3476)

## What is Sharkord?

> [!NOTE]
> Sharkord is in alpha stage. Bugs, incomplete features and breaking changes are to be expected.

Sharkord is a self-hosted communication platform that brings the most important Discord-like features to your own infrastructure. Voice, video, and screen sharing without the bloat or surveillance.

## Screenshots

![Sharkord Screenshot](https://i.imgur.com/urO9vKC.png)

## Features

- **Voice channels** with video and screen sharing, over a built-in mediasoup SFU
- **Text channels** grouped into categories, with threads, replies, reactions, pins and search
- **Direct messages** between members
- **Roles and permissions**, with per-channel overrides for individual roles and users
- **Custom emoji**, mentions and channel references
- **Invites** with usage limits and automatic role assignment
- **File uploads** with per-user storage quotas and optional signed URLs
- **Plugins** that extend both server and client, through the [plugin SDK](packages/plugin-sdk)

## Docs

For detailed documentation, please visit our [Documentation](https://sharkord.com/docs).

## Wanna Try It Out?

Check out the Live Demo at [demo.sharkord.com](https://demo.sharkord.com).

## Getting Started

Sharkord is distributed as a standalone binary that bundles both server and client components. Get started by downloading the latest release for your platform from the [Releases](https://github.com/Sharkord/sharkord/releases) page. We ship binaries for Windows, macOS, and Linux.

#### Linux x64

```bash
curl -L https://github.com/sharkord/sharkord/releases/latest/download/sharkord-linux-x64 -o sharkord
chmod +x sharkord
./sharkord
```

#### Docker

Sharkord can also be run using Docker. Here's how to run it:

```bash
docker run \
  -p 4991:4991/tcp \
  -p 40000:40000/tcp \
  -p 40000:40000/udp \
  -v ./data:/home/bun/.config/sharkord \
  --name sharkord \
  sharkord/sharkord:latest
```

> [!WARNING]
> Upon first launch, Sharkord creates a secret token and prints it to the console. It is both the credential that grants owner access and the key your server signs every session and file URL with, so anyone who obtains it can take ownership **and** impersonate any account. Keep it out of logs, screenshots and issue reports, store it securely, and do not lose it.

Once the server is running, open your web browser and navigate to [http://localhost:4991](http://localhost:4991) to access the Sharkord client interface. If you're running the server on a different machine, replace `localhost` with the server's IP address or domain name.

Check out our [Documentation](https://sharkord.com/docs) for more detailed setup instructions, configuration options, and troubleshooting tips.

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details, and [Development](DEVELOPMENT.md) for running Sharkord locally.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

Built with amazing open-source technologies:

- [Bun](https://bun.sh)
- [tRPC](https://trpc.io)
- [Mediasoup](https://mediasoup.org)
- [Drizzle ORM](https://orm.drizzle.team)
- [React](https://react.dev)
- [Radix UI](https://www.radix-ui.com)
- [ShadCN UI](https://ui.shadcn.com/)
- [Tailwind CSS](https://tailwindcss.com)

<div align="center">
  <p>Made with ❤️ by the Sharkord team</p>
  <p>
    <a href="https://github.com/Sharkord/sharkord">GitHub</a> •
    <a href="https://github.com/Sharkord/sharkord/issues">Issues</a> •
    <a href="https://github.com/Sharkord/sharkord/discussions">Discussions</a>
  </p>
</div>
