<div align="center">
  <h1>Sharkord</h1>
  <p><strong>A lightweight, self-hosted real-time communication platform</strong></p>
  
  [![Version](https://img.shields.io/github/v/release/Sharkord/sharkord)](https://github.com/Sharkord/sharkord/releases)
  [![License](https://img.shields.io/github/license/Sharkord/sharkord)](LICENSE)
  [![Downloads](https://img.shields.io/github/downloads/Sharkord/sharkord/total)](https://github.com/Sharkord/sharkord/releases)
  [![Last Commit](https://img.shields.io/github/last-commit/Sharkord/sharkord)](https://github.com/Sharkord/sharkord/commits)
  
  [![Bun](https://img.shields.io/badge/Bun-v1.3.5-green.svg)](https://bun.sh)
  [![Mediasoup](https://img.shields.io/badge/Mediasoup-v3.19.11-green.svg)](https://mediasoup.org)
</div>

## What is Sharkord?

> [!NOTE]
> Sharkord is in alpha stage. Bugs, incomplete features and breaking changes are to be expected.

Sharkord is a self-hosted communication platform that brings the most important Discord-like features to your own infrastructure. Host voice channels, text chat, and file sharing on your terms—no third-party dependencies, complete data ownership, and full control over your group's communication.

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
  -p 40000-40020:40000-40020/tcp \
  -p 40000-40020:40000-40020/udp \
  -v ./data:/root/.config/sharkord \
  --name sharkord \
  sharkord/sharkord:latest
```

#### Windows

1. Download the latest `sharkord-windows-x64.exe` from the [Releases](https://github.com/sharkord/sharkord/releases/latest) page.
2. Open Command Prompt and navigate to the directory where you downloaded the executable.
3. Run the server with the command: `.\sharkord-windows-x64.exe`

Make sure you download Microsoft Visual C++ 2015 - 2022 Redistributable (x64) from [here](https://aka.ms/vs/17/release/vc_redist.x64.exe) and install it before running Sharkord on Windows.

### Open The Client

Once the server is running, open your web browser and navigate to [http://localhost:4991](http://localhost:4991) to access the Sharkord client interface. If you're running the server on a different machine, replace `localhost` with the server's IP address or domain name.

> [!NOTE]
> Upon first launch, Sharkord will create a secure token and print it to the console. This token allows ANYONE to gain owner access to your server, so make sure to store it securely and do not lose it!

### Gain Owner Permissions

1. Login into your server
2. Open Dev Tools (`CTRL + Shift + I` or `Right Click > Inspect`)
3. Open the console
4. Type useToken('your_token_here')
5. Press enter
6. Your account will now have the owner role

The way of using this token will be more user friendly in the future.

## Configuration

Upon first run, Sharkord will generate a default configuration file located at `~/.config/sharkord/config.ini`. You can modify this file to customize your server settings.

### Options

| Field         | Default | Description                                                                                 |
| ------------- | ------- | ------------------------------------------------------------------------------------------- |
| `port`        | `4991`  | The port number on which the server will listen for HTTP and WebSocket connections          |
| `debug`       | `false` | Enable debug logging for detailed server logs and diagnostics                               |
| `maxFiles`    | `40`    | Maximum number of files that can be uploaded in a single request                            |
| `maxFileSize` | `100`   | Maximum file size in megabytes (MB) allowed per uploaded file                               |
| `rtcMinPort`  | `40000` | Minimum UDP port for WebRTC media traffic (voice/video)                                     |
| `rtcMaxPort`  | `40020` | Maximum UDP port for WebRTC media traffic (voice/video)                                     |
| `autoupdate`  | `false` | When enabled, it will automatically check for and install updates with no user intervention |

> [!IMPORTANT]  
> `rtcMinPort` and `rtcMaxPort` will define how many concurrent voice/video connections your server can handle. Each active voice/video connection uses one UDP port. Make sure to adjust the range according to your expected load. These ports must be open in your firewall settings, both TCP and UDP. If you're running Sharkord in Docker, remember to map this port range from the host to the container.

## HTTPS Setup

At the moment, Sharkord does not have built-in support for HTTPS. To secure your server with HTTPS, we recommend using a reverse proxy like Nginx or Caddy in front of Sharkord. This setup allows you to manage SSL/TLS certificates and handle secure connections.

## Plugins (experimental)

See the [Plugin SDK](packages/plugin-sdk/README.md) for more information on creating and using plugins with Sharkord.

> [!IMPORTANT]  
> If you are planning to use plugins, it's recommended to use Docker since they can execute arbitrary code on the host machine, which may pose security risks. Only use plugins you trust.

Example plugins:

- [Sharkord Music Bot](https://github.com/diogomartino/sharkord-music-bot) - A plugin that adds music playback capabilities to Sharkord voice channels using YouTube as a source.
- [Sharkord IPTV](https://github.com/diogomartino/sharkord-iptv) - A plugin that allows users to stream IPTV channels directly within Sharkord voice channels.

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
