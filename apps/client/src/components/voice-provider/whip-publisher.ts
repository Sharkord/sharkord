import { getSessionStorageItem, SessionStorageKey } from '@/helpers/storage';
import { getScreenShareSimulcastEncodings } from './helpers';

type TWhipPublisherOptions = {
  channelId: number;
  videoTrack: MediaStreamTrack;
  audioTrack?: MediaStreamTrack;
  simulcast: boolean;
  maxBitrateKbps: number;
  // mimeType preference from the user's screen codec setting; the server
  // filters whatever ends up being offered anyway, so this is best-effort
  codecMimeType?: string;
};

// the surface the voice provider and the transport stats hook rely on; the
// stats hook only ever calls closed and getStats(), and RTCPeerConnection
// reports the same RTCStatsReport shape mediasoup-client producers do
type TWhipPublisher = {
  closed: boolean;
  getStats: () => Promise<RTCStatsReport>;
  close: () => void;
};

// rids are applied over the low-first encodings the mediasoup side expects;
// the browser lists them highest-first in a=simulcast and the server undoes
// that ordering, so layer indexing stays identical to the mediasoup-client
// path
const SIMULCAST_RIDS = ['WebLow', 'WebMid', 'WebHigh'];

const createWhipPublisher = async ({
  channelId,
  videoTrack,
  audioTrack,
  simulcast,
  maxBitrateKbps,
  codecMimeType
}: TWhipPublisherOptions): Promise<TWhipPublisher> => {
  const token = getSessionStorageItem(SessionStorageKey.TOKEN) || '';
  const peerConnection = new RTCPeerConnection();

  const encodings = simulcast
    ? getScreenShareSimulcastEncodings(maxBitrateKbps * 1000).map(
        (encoding, index) => ({
          ...encoding,
          rid: SIMULCAST_RIDS[index] ?? `WebLayer${index}`
        })
      )
    : [{ maxBitrate: maxBitrateKbps * 1000 }];

  const videoTransceiver = peerConnection.addTransceiver(videoTrack, {
    direction: 'sendonly',
    sendEncodings: encodings
  });

  if (codecMimeType) {
    const capabilities = RTCRtpSender.getCapabilities('video');
    const preferredCodecs = capabilities?.codecs.filter(
      (codec) =>
        codec.mimeType.toLowerCase() === codecMimeType.toLowerCase() ||
        codec.mimeType.toLowerCase() === 'video/rtx'
    );

    // unsupported or partially supported browsers just keep the default set
    if (preferredCodecs?.length) {
      try {
        videoTransceiver.setCodecPreferences(preferredCodecs);
      } catch {
        // not fatal, the server filters codecs regardless
      }
    }
  }

  if (audioTrack) {
    peerConnection.addTransceiver(audioTrack, { direction: 'sendonly' });
  }

  const offer = await peerConnection.createOffer();

  // browsers offer mono opus by default; the screen audio path is stereo on
  // the mediasoup-client side, so mirror broadcast-box's fmtp patch to keep
  // the same behavior
  const offerSdp = audioTrack
    ? (offer.sdp ?? '').replace(
        /(a=fmtp:\d+ .*?)(useinbandfec=1)(?!.*stereo)/,
        '$1$2;stereo=1'
      )
    : (offer.sdp ?? '');

  await peerConnection.setLocalDescription({
    type: 'offer',
    sdp: offerSdp
  });

  const response = await fetch(`/whip/${channelId}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/sdp'
    },
    body: offerSdp
  });

  if (response.status !== 201) {
    peerConnection.close();

    throw new Error(`WHIP session rejected with status ${response.status}`);
  }

  const sessionPath = response.headers.get('location');
  const answerSdp = await response.text();

  await peerConnection.setRemoteDescription({
    type: 'answer',
    sdp: answerSdp
  });

  const publisher: TWhipPublisher = {
    closed: false,
    getStats: () => peerConnection.getStats(),
    close: () => {
      if (publisher.closed) return;

      publisher.closed = true;

      try {
        peerConnection.close();
      } catch {
        // already closed
      }

      if (sessionPath) {
        void fetch(new URL(sessionPath, window.location.origin).href, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` }
        }).catch(() => {
          // the server also tears the session down on ICE/DTLS failure
        });
      }
    }
  };

  peerConnection.addEventListener('connectionstatechange', () => {
    if (
      peerConnection.connectionState === 'failed' ||
      peerConnection.connectionState === 'disconnected'
    ) {
      publisher.close();
    }
  });

  return publisher;
};

export { createWhipPublisher };
export type { TWhipPublisher };
