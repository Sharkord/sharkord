import type { AppData, WebRtcTransport } from 'mediasoup/types';

type TWhipSession = {
  id: string;
  channelId: number;
  // set when the session was started with a user token instead of the global
  // key; the producers are registered as this user's screen share
  userId?: number;
  transport: WebRtcTransport<AppData>;
  remoteIceUfrag: string;
  createdAt: number;
};

const whipSessions = new Map<string, TWhipSession>();

// closing the transport closes its producers, and the producer close
// handlers registered by VoiceRuntime tear the external stream or the user's
// screen producers down and notify every client in the channel, so no extra
// cleanup is needed here
const closeWhipSession = (sessionId: string) => {
  const session = whipSessions.get(sessionId);

  if (!session) return;

  whipSessions.delete(sessionId);

  try {
    session.transport.close();
  } catch {
    // already closed, nothing to do
  }
};

export { closeWhipSession, whipSessions };
export type { TWhipSession };
