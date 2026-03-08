<div align="center">
  <h1>Sharkord</h1>
  <p><strong>A lightweight, self-hosted real-time communication platform</strong></p>
  
  [![Version](https://img.shields.io/github/v/release/Sharkord/sharkord)](https://github.com/Sharkord/sharkord/releases)
  [![License](https://img.shields.io/github/license/Sharkord/sharkord)](LICENSE)
  [![Downloads](https://img.shields.io/github/downloads/Sharkord/sharkord/total)](https://github.com/Sharkord/sharkord/releases)
  [![Last Commit](https://img.shields.io/github/last-commit/Sharkord/sharkord)](https://github.com/Sharkord/sharkord/commits)
  
  [![Bun](https://img.shields.io/badge/Bun-v1.3.10-green.svg)](https://bun.sh)
  [![Mediasoup](https://img.shields.io/badge/Mediasoup-v3.19.11-green.svg)](https://mediasoup.org)
</div>

[![ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/B0B71U3476)

## What is Sharkord?

> [!NOTE]
> Sharkord is in alpha stage. Bugs, incomplete features and breaking changes are to be expected.

Sharkord is a self-hosted communication platform that brings the most important Discord-like features to your own infrastructure. Host voice channels, text chat, and file sharing on your terms—no third-party dependencies, complete data ownership, and full control over your group's communication.

## Docs

For detailed documentation, please visit our [Documentation](https://sharkord.com/docs).

## Wanna Try It Out?

Check out the Live Demo at [demo.sharkord.com](https://demo.sharkord.com). The amount of ports opened for the demo is limited, so voice and video features will only work for a couple of users at a time. If you want to test it with a larger group, we recommend running your own instance.

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

> [!NOTE]
> Upon first launch, Sharkord will create a secure token and print it to the console. This token allows ANYONE to gain owner access to your server, so make sure to store it securely and do not lose it!

Once the server is running, open your web browser and navigate to [http://localhost:4991](http://localhost:4991) to access the Sharkord client interface. If you're running the server on a different machine, replace `localhost` with the server's IP address or domain name.

Check out our [Documentation](https://sharkord.com/docs) for more detailed setup instructions, configuration options, and troubleshooting tips.

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

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
