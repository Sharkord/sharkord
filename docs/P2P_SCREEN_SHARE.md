# Direct peer-to-peer screen sharing

Sharkord supports two screen-share transports:

- **Direct** creates a browser `RTCPeerConnection` between the two voice participants. Screen video and optional system audio tracks are sent on that connection, not through Sharkord's mediasoup SFU.
- **Server (SFU)** uses the existing mediasoup producer and consumer transports.

Direct is the default choice and is remembered in the browser's local storage. The transport can be changed in **Settings → Devices**, or in the settings dialog shown before starting a screen share. A failed direct connection does not switch transports automatically. Stop sharing, select **Server (SFU)**, and start sharing again if a relay through the Sharkord SFU is acceptable.

## Eligibility and negotiation

On voice join, a client declares whether its browser supports `RTCPeerConnection`. The server treats a missing capability field as unsupported, which keeps older clients on the existing SFU path. Direct sharing is allowed only when:

1. exactly two users are in the same non-DM voice runtime;
2. both users declared direct-sharing support; and
3. the sharer has the global and channel screen-share permissions.

The server relays offer, answer, ICE candidate, and stop messages over the existing authenticated tRPC voice lane. It does not handle the media tracks in direct mode. The server rejects signaling from users outside the active pair and removes negotiations when a participant leaves or the channel is no longer 1:1.

## ICE configuration

The default configuration uses Google's public STUN service:

```json
[{"urls":"stun:stun.l.google.com:19302"}]
```

Operators can replace the list in `config.ini` under `[peerToPeer]` or through `SHARKORD_P2P_ICE_SERVERS`. The environment variable must contain a JSON array of WebRTC ICE server objects, for example:

```json
[
  {"urls":"stun:stun.example.net:3478"},
  {
    "urls":["turn:turn.example.net:3478?transport=udp","turns:turn.example.net:5349"],
    "username":"replace-with-a-short-lived-username",
    "credential":"replace-with-a-short-lived-credential"
  }
]
```

The default STUN-only setup cannot relay traffic through restrictive NATs, so some peers will not connect. If a TURN server is configured, that service relays the media; use it only if that network path and provider are acceptable. ICE credentials should be managed as secrets and rotated according to the TURN provider's guidance.

## Local verification

1. Start the Sharkord server and client normally.
2. Open the same server in two separate browser profiles, sign in as two different users, and join the same non-DM voice channel.
3. Confirm **Direct** is selected in **Settings → Devices** on the sharing browser. Start screen sharing and choose a display or window.
4. Confirm the receiver sees the screen and the sharing browser reports **Direct screen share connected**. If sharing system audio is enabled and the browser provides an audio track, verify that audio as well.
5. Stop and start sharing with **Server (SFU)** selected. Confirm that the existing SFU path still works.
6. To exercise the failure path, use peers whose network blocks direct ICE connectivity. Confirm sharing reports a failure and does not switch to SFU; manually choose **Server (SFU)** to retry.
7. With Direct active, join the voice channel from a third browser profile. The direct negotiation should be stopped because the channel is no longer 1:1.

The automated server tests cover negotiation validation, permissions, capability and participant checks, event delivery, rate limits, and cleanup. They do not replace testing ICE connectivity across the target browsers and networks.
