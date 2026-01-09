import {
  StreamKind,
  type TChannelState,
  type TRemoteProducerIds,
  type TTransportParams,
  type TVoiceMap,
  type TVoiceUserState
} from '@sharkord/shared';
import type {
  AppData,
  Consumer,
  Producer,
  Router,
  RouterOptions,
  WebRtcTransport,
  WebRtcTransportOptions
} from 'mediasoup/types';
import { SERVER_PUBLIC_IP } from '../config';
import { logger } from '../logger';
import { eventBus } from '../plugins/event-bus';
import { IS_PRODUCTION } from '../utils/env';
import { mediaSoupWorker } from '../utils/mediasoup';

const voiceRuntimes = new Map<number, VoiceRuntime>();

const defaultRouterOptions: RouterOptions<AppData> = {
  mediaCodecs: [
    {
      kind: 'video',
      mimeType: 'video/VP8',
      clockRate: 90000,
      parameters: {
        'x-google-start-bitrate': 1000
      }
    },
    {
      kind: 'video',
      mimeType: 'video/H264',
      clockRate: 90000,
      parameters: {
        'packetization-mode': 1,
        'profile-level-id': '42e01f',
        'level-asymmetry-allowed': 1,
        'x-google-start-bitrate': 1000
      }
    },
    {
      kind: 'audio',
      mimeType: 'audio/opus',
      clockRate: 48000,
      channels: 2
    }
  ]
};

const RECONNECT_TIMEOUT_MS = 5000; // 5 seconds

const getListenInfos = (): NonNullable<
  WebRtcTransportOptions<AppData>['listenInfos']
> => {
  if (IS_PRODUCTION) {
    return [
      {
        protocol: 'udp',
        ip: '0.0.0.0',
        announcedAddress: SERVER_PUBLIC_IP
      },
      {
        protocol: 'tcp',
        ip: '0.0.0.0',
        announcedAddress: SERVER_PUBLIC_IP
      }
    ];
  }

  return [
    {
      protocol: 'udp',
      ip: '127.0.0.1',
      announcedAddress: undefined
    },
    {
      protocol: 'tcp',
      ip: '127.0.0.1',
      announcedAddress: undefined
    }
  ];
};

const defaultRtcTransportOptions: WebRtcTransportOptions<AppData> = {
  listenInfos: getListenInfos(),
  enableUdp: true,
  enableTcp: true,
  preferUdp: true,
  preferTcp: false,
  initialAvailableOutgoingBitrate: 1000000
};

const defaultUserState: TVoiceUserState = {
  micMuted: false,
  soundMuted: false,
  webcamEnabled: false,
  sharingScreen: false
};

type TTransportMap = {
  [userId: number]: WebRtcTransport<AppData>;
};

type TProducerMap = {
  [userId: number]: Producer<AppData>;
};

type TConsumerMap = {
  [userId: number]: {
    [remoteId: number]: Consumer<AppData>;
  };
};

class VoiceRuntime {
  public readonly id: number;
  private state: TChannelState = { users: [] };
  private router?: Router<AppData>;
  private consumerTransports: TTransportMap = {};
  private producerTransports: TTransportMap = {};
  private videoProducers: TProducerMap = {};
  private audioProducers: TProducerMap = {};
  private screenProducers: TProducerMap = {};
  private consumers: TConsumerMap = {};

  private externalCounter = 0;
  private externalVideoProducers: TProducerMap = {};
  private externalAudioProducers: TProducerMap = {};

  constructor(channelId: number) {
    this.id = channelId;
    voiceRuntimes.set(channelId, this);
  }

  public static findById = (channelId: number): VoiceRuntime | undefined => {
    return voiceRuntimes.get(channelId);
  };

  public static findRuntimeByUserId = (
    userId: number
  ): VoiceRuntime | undefined => {
    for (const runtime of voiceRuntimes.values()) {
      if (runtime.getUser(userId)) {
        return runtime;
      }
    }

    return undefined;
  };

  public static getVoiceMap = (): TVoiceMap => {
    const map: TVoiceMap = {};

    voiceRuntimes.forEach((runtime, channelId) => {
      map[channelId] = {
        users: {}
      };

      runtime.getState().users.forEach((user) => {
        if (!map[channelId]) {
          map[channelId] = { users: {} };
        }

        map[channelId].users[user.userId] = user.state;
      });
    });

    return map;
  };

  public init = async (): Promise<void> => {
    logger.debug(`Initializing voice runtime for channel ${this.id}`);

    await this.createRouter();

    eventBus.emit('voice:runtime_initialized', {
      channelId: this.id
    });
  };

  public destroy = async () => {
    await this.router?.close();

    Object.values(this.consumerTransports).forEach((transport) => {
      transport.close();
    });

    Object.values(this.producerTransports).forEach((transport) => {
      transport.close();
    });

    Object.values(this.videoProducers).forEach((producer) => {
      producer.close();
    });

    Object.values(this.screenProducers).forEach((producer) => {
      producer.close();
    });

    Object.values(this.audioProducers).forEach((producer) => {
      producer.close();
    });

    Object.values(this.externalVideoProducers).forEach((producer) => {
      producer.close();
    });

    Object.values(this.externalAudioProducers).forEach((producer) => {
      producer.close();
    });

    Object.values(this.consumers).forEach((consumers) => {
      Object.values(consumers).forEach((consumer) => {
        consumer.close();
      });
    });

    voiceRuntimes.delete(this.id);
  };

  public getState = (): TChannelState => {
    return this.state;
  };

  public getUser = (userId: number) => {
    return this.state.users.find((u) => u.userId === userId);
  };

  public getUserState = (userId: number): TVoiceUserState => {
    const user = this.getUser(userId);

    return user?.state ?? defaultUserState;
  };

  public addUser = (
    userId: number,
    state: Pick<TVoiceUserState, 'micMuted' | 'soundMuted'>
  ) => {
    if (this.getUser(userId)) return;

    this.state.users.push({
      userId,
      state: {
        ...defaultUserState,
        ...state
      }
    });
  };

  public removeUser = (userId: number) => {
    this.state.users = this.state.users.filter((u) => u.userId !== userId);

    this.cleanupUserResources(userId);
  };

  private cleanupUserResources = (userId: number) => {
    this.removeProducerTransport(userId);
    this.removeConsumerTransport(userId);

    this.removeProducer(userId, StreamKind.AUDIO);
    this.removeProducer(userId, StreamKind.VIDEO);
    this.removeProducer(userId, StreamKind.SCREEN);

    if (this.consumers[userId]) {
      Object.values(this.consumers[userId]).forEach((consumer) => {
        consumer.close();
      });

      delete this.consumers[userId];
    }

    Object.keys(this.consumers).forEach((consumerUserIdStr) => {
      const consumerId = parseInt(consumerUserIdStr);

      if (consumerId !== userId && this.consumers[consumerId]?.[userId]) {
        this.consumers[consumerId][userId].close();

        delete this.consumers[consumerId][userId];
      }
    });
  };

  public updateUserState = (
    userId: number,
    newState: Partial<TChannelState['users'][0]['state']>
  ) => {
    const user = this.getUser(userId);

    if (!user) return;

    user.state = { ...user.state, ...newState };
  };

  public getRouter = (): Router<AppData> => {
    if (!this.router) {
      throw new Error('Router not initialized yet');
    }

    return this.router;
  };

  private createRouter = async () => {
    const router = await mediaSoupWorker.createRouter(defaultRouterOptions);

    this.router = router;
  };

  public createTransport = async () => {
    const router = this.getRouter();

    const transport = await router.createWebRtcTransport(
      defaultRtcTransportOptions
    );

    const params: TTransportParams = {
      id: transport.id,
      iceParameters: transport.iceParameters,
      iceCandidates: transport.iceCandidates,
      dtlsParameters: transport.dtlsParameters
    };

    return { transport, params };
  };

  public createConsumerTransport = async (userId: number) => {
    const { transport, params } = await this.createTransport();

    this.consumerTransports[userId] = transport;

    transport.observer.on('close', () => {
      delete this.consumerTransports[userId];

      if (this.consumers[userId]) {
        Object.values(this.consumers[userId]).forEach((consumer) => {
          consumer.close();
        });

        delete this.consumers[userId];
      }
    });

    transport.on('dtlsstatechange', (state) => {
      if (state === 'failed' || state === 'closed') {
        this.removeConsumerTransport(userId);
      }
    });

    transport.on('icestatechange', (state) => {
      if (state === 'disconnected') {
        setTimeout(() => {
          if (transport.iceState === 'disconnected') {
            this.removeConsumerTransport(userId);
          }
        }, RECONNECT_TIMEOUT_MS);
      }
    });

    return params;
  };

  public removeConsumerTransport = (userId: number) => {
    const transport = this.consumerTransports[userId];

    if (!transport) return;

    transport.close();
  };

  public getConsumerTransport = (userId: number) => {
    return this.consumerTransports[userId];
  };

  public createProducerTransport = async (userId: number) => {
    const { params, transport } = await this.createTransport();

    this.producerTransports[userId] = transport;

    transport.observer.on('close', () => {
      delete this.producerTransports[userId];

      this.removeProducer(userId, StreamKind.AUDIO);
      this.removeProducer(userId, StreamKind.VIDEO);
      this.removeProducer(userId, StreamKind.SCREEN);
    });

    transport.on('dtlsstatechange', (state) => {
      if (state === 'failed' || state === 'closed') {
        this.removeProducerTransport(userId);
      }
    });

    transport.on('icestatechange', (state) => {
      if (state === 'disconnected') {
        logger.warn('Producer transport ICE disconnected for user %d', userId);

        setTimeout(() => {
          if (transport.iceState === 'disconnected') {
            this.removeProducerTransport(userId);
          }
        }, RECONNECT_TIMEOUT_MS);
      }
    });

    return params;
  };

  public removeProducerTransport = (userId: number) => {
    const transport = this.producerTransports[userId];

    if (!transport) return;

    transport.close();
  };

  public getProducerTransport = (userId: number) => {
    return this.producerTransports[userId];
  };

  public getProducer = (type: StreamKind, userId: number) => {
    switch (type) {
      case StreamKind.VIDEO:
        return this.videoProducers[userId];
      case StreamKind.AUDIO:
        return this.audioProducers[userId];
      case StreamKind.SCREEN:
        return this.screenProducers[userId];
      case StreamKind.EXTERNAL_VIDEO:
        return this.externalVideoProducers[userId];
      case StreamKind.EXTERNAL_AUDIO:
        return this.externalAudioProducers[userId];
      default:
        return undefined;
    }
  };

  public addProducer = (
    userId: number,
    type: StreamKind,
    producer: Producer
  ) => {
    if (type === StreamKind.VIDEO) {
      this.videoProducers[userId] = producer;
    } else if (type === StreamKind.AUDIO) {
      this.audioProducers[userId] = producer;
    } else if (type === StreamKind.SCREEN) {
      this.screenProducers[userId] = producer;
    } else if (type === StreamKind.EXTERNAL_VIDEO) {
      this.externalVideoProducers[userId] = producer;
    } else if (type === StreamKind.EXTERNAL_AUDIO) {
      this.externalAudioProducers[userId] = producer;
    }

    producer.observer.on('close', () => {
      if (type === StreamKind.VIDEO) {
        delete this.videoProducers[userId];
      } else if (type === StreamKind.AUDIO) {
        delete this.audioProducers[userId];
      } else if (type === StreamKind.SCREEN) {
        delete this.screenProducers[userId];
      } else if (type === StreamKind.EXTERNAL_VIDEO) {
        delete this.externalVideoProducers[userId];
      } else if (type === StreamKind.EXTERNAL_AUDIO) {
        delete this.externalAudioProducers[userId];
      }
    });
  };

  public removeProducer(userId: number, type: StreamKind) {
    let producer: Producer | undefined;

    switch (type) {
      case StreamKind.VIDEO:
        if (this.videoProducers[userId]) {
          producer = this.videoProducers[userId];
        }
        break;
      case StreamKind.AUDIO:
        if (this.audioProducers[userId]) {
          producer = this.audioProducers[userId];
        }
        break;
      case StreamKind.SCREEN:
        if (this.screenProducers[userId]) {
          producer = this.screenProducers[userId];
        }
        break;
      case StreamKind.EXTERNAL_VIDEO:
        if (this.externalVideoProducers[userId]) {
          producer = this.externalVideoProducers[userId];
        }
        break;
      case StreamKind.EXTERNAL_AUDIO:
        if (this.externalAudioProducers[userId]) {
          producer = this.externalAudioProducers[userId];
        }
        break;
      default:
        return;
    }

    if (!producer) return;

    producer.close();

    if (type === StreamKind.VIDEO) {
      delete this.videoProducers[userId];
    } else if (type === StreamKind.AUDIO) {
      delete this.audioProducers[userId];
    } else if (type === StreamKind.SCREEN) {
      delete this.screenProducers[userId];
    } else if (type === StreamKind.EXTERNAL_VIDEO) {
      delete this.externalVideoProducers[userId];
    } else if (type === StreamKind.EXTERNAL_AUDIO) {
      delete this.externalAudioProducers[userId];
    }
  }

  public addConsumer = (
    userId: number,
    remoteId: number,
    consumer: Consumer<AppData>
  ) => {
    if (!this.consumers[userId]) {
      this.consumers[userId] = {};
    }

    this.consumers[userId][remoteId] = consumer;

    consumer.observer.on('close', () => {
      delete this.consumers[userId]?.[remoteId];
    });
  };

  public addExternalProducer = (type: StreamKind, producer: Producer) => {
    const id = this.externalCounter++;

    if (type === StreamKind.EXTERNAL_VIDEO) {
      this.externalVideoProducers[id] = producer;
    } else if (type === StreamKind.EXTERNAL_AUDIO) {
      this.externalAudioProducers[id] = producer;
    }

    producer.observer.on('close', () => {
      if (type === StreamKind.EXTERNAL_VIDEO) {
        delete this.externalVideoProducers[id];
      } else if (type === StreamKind.EXTERNAL_AUDIO) {
        delete this.externalAudioProducers[id];
      }
    });

    return id;
  };

  public getRemoteIds = (userId: number): TRemoteProducerIds => {
    return {
      remoteVideoIds: Object.keys(this.videoProducers)
        .filter((id) => +id !== userId)
        .map((id) => +id),
      remoteAudioIds: Object.keys(this.audioProducers)
        .filter((id) => +id !== userId)
        .map((id) => +id),
      remoteScreenIds: Object.keys(this.screenProducers)
        .filter((id) => +id !== userId)
        .map((id) => +id),
      remoteExternalVideoIds: Object.keys(this.externalVideoProducers)
        .filter((id) => +id !== userId)
        .map((id) => +id),
      remoteExternalAudioIds: Object.keys(this.externalAudioProducers)
        .filter((id) => +id !== userId)
        .map((id) => +id)
    };
  };
}

export { VoiceRuntime };
