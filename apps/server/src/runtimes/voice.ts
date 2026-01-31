import {
  ServerEvents,
  StreamKind,
  type TChannelState,
  type TExternalStreamsMap,
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
import { pubsub } from '../utils/pubsub';

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

type TExternalStreamProducers = {
  audioProducer?: Producer<AppData>;
  videoProducer?: Producer<AppData>;
};

type TExternalStreamInternal = {
  title: string;
  key: string;
  pluginId: string;
  avatarUrl?: string;
  producers: TExternalStreamProducers;
};

class VoiceRuntime {
  public readonly id: number;
  private state: TChannelState = { users: [], externalStreams: {} };
  private router?: Router<AppData>;
  private consumerTransports: TTransportMap = {};
  private producerTransports: TTransportMap = {};
  private videoProducers: TProducerMap = {};
  private audioProducers: TProducerMap = {};
  private screenProducers: TProducerMap = {};
  private consumers: TConsumerMap = {};

  private externalCounter = 0;
  private externalStreamsInternal: {
    [streamId: number]: TExternalStreamInternal;
  } = {};

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

  public static getExternalStreamsMap = (): TExternalStreamsMap => {
    const map: TExternalStreamsMap = {};

    voiceRuntimes.forEach((runtime, channelId) => {
      if (map[channelId]) {
        map[channelId] = [];
      }

      map[channelId] = runtime.getState().externalStreams;
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

    Object.values(this.externalStreamsInternal).forEach((stream) => {
      if (
        stream.producers.videoProducer &&
        !stream.producers.videoProducer.closed
      ) {
        stream.producers.videoProducer.close();
      }
      if (
        stream.producers.audioProducer &&
        !stream.producers.audioProducer.closed
      ) {
        stream.producers.audioProducer.close();
      }
    });

    Object.values(this.consumers).forEach((consumers) => {
      Object.values(consumers).forEach((consumer) => {
        consumer.close();
      });
    });

    voiceRuntimes.delete(this.id);

    eventBus.emit('voice:runtime_closed', {
      channelId: this.id
    });
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

  public getProducer = (type: StreamKind, id: number) => {
    switch (type) {
      case StreamKind.VIDEO:
        return this.videoProducers[id];
      case StreamKind.AUDIO:
        return this.audioProducers[id];
      case StreamKind.SCREEN:
        return this.screenProducers[id];
      case StreamKind.EXTERNAL_VIDEO:
        return this.externalStreamsInternal[id]?.producers.videoProducer;
      case StreamKind.EXTERNAL_AUDIO:
        return this.externalStreamsInternal[id]?.producers.audioProducer;
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
    }

    producer.observer.on('close', () => {
      if (type === StreamKind.VIDEO) {
        delete this.videoProducers[userId];
      } else if (type === StreamKind.AUDIO) {
        delete this.audioProducers[userId];
      } else if (type === StreamKind.SCREEN) {
        delete this.screenProducers[userId];
      }
    });
  };

  public removeProducer(userId: number, type: StreamKind) {
    let producer: Producer | undefined;

    switch (type) {
      case StreamKind.VIDEO:
        producer = this.videoProducers[userId];
        break;
      case StreamKind.AUDIO:
        producer = this.audioProducers[userId];
        break;
      case StreamKind.SCREEN:
        producer = this.screenProducers[userId];
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

  public createExternalStream = (options: {
    title: string;
    key: string;
    pluginId: string;
    avatarUrl?: string;
    producers: {
      audio?: Producer;
      video?: Producer;
    };
  }) => {
    const streamId = this.externalCounter++;

    const { title, key, pluginId, avatarUrl, producers } = options;

    this.externalStreamsInternal[streamId] = {
      title,
      key,
      pluginId,
      avatarUrl,
      producers: {
        audioProducer: producers.audio,
        videoProducer: producers.video
      }
    };

    if (producers.audio) {
      this.setupExternalProducerCloseHandler(
        streamId,
        'audio',
        producers.audio
      );
    }

    if (producers.video) {
      this.setupExternalProducerCloseHandler(
        streamId,
        'video',
        producers.video
      );
    }

    this.state.externalStreams[streamId] = {
      title,
      key,
      pluginId,
      avatarUrl,
      tracks: {
        audio: !!producers.audio,
        video: !!producers.video
      }
    };

    return streamId;
  };

  private setupExternalProducerCloseHandler = (
    streamId: number,
    kind: 'audio' | 'video',
    producer: Producer
  ) => {
    producer.observer.on('close', () => {
      const internal = this.externalStreamsInternal[streamId];

      if (!internal) return;

      if (kind === 'audio') {
        delete internal.producers.audioProducer;
      } else {
        delete internal.producers.videoProducer;
      }

      const hasProducers =
        internal.producers.audioProducer || internal.producers.videoProducer;

      if (!hasProducers) {
        this.removeExternalStream(streamId);
      } else {
        const existingStream = this.state.externalStreams[streamId];

        if (existingStream) {
          existingStream.tracks = {
            audio: !!internal.producers.audioProducer,
            video: !!internal.producers.videoProducer
          };

          pubsub.publish(ServerEvents.VOICE_UPDATE_EXTERNAL_STREAM, {
            channelId: this.id,
            streamId,
            stream: existingStream
          });
        }
      }
    });
  };

  public removeExternalStream = (streamId: number) => {
    const internal = this.externalStreamsInternal[streamId];

    if (!internal) return;

    if (
      internal.producers.audioProducer &&
      !internal.producers.audioProducer.closed
    ) {
      internal.producers.audioProducer.close();
    }
    if (
      internal.producers.videoProducer &&
      !internal.producers.videoProducer.closed
    ) {
      internal.producers.videoProducer.close();
    }

    delete this.externalStreamsInternal[streamId];
    delete this.state.externalStreams[streamId];

    pubsub.publish(ServerEvents.VOICE_REMOVE_EXTERNAL_STREAM, {
      channelId: this.id,
      streamId
    });
  };

  public updateExternalStream = (
    streamId: number,
    options: {
      title?: string;
      avatarUrl?: string;
      producers?: {
        audio?: Producer;
        video?: Producer;
      };
    }
  ) => {
    const internal = this.externalStreamsInternal[streamId];

    if (!internal) return;

    const publicStream = this.state.externalStreams[streamId];

    if (!publicStream) return;

    if (options.title !== undefined) {
      internal.title = options.title;
      publicStream.title = options.title;
    }

    if (options.avatarUrl !== undefined) {
      internal.avatarUrl = options.avatarUrl;
      publicStream.avatarUrl = options.avatarUrl;
    }

    if (options.producers) {
      if (options.producers.audio !== undefined) {
        if (
          internal.producers.audioProducer &&
          !internal.producers.audioProducer.closed
        ) {
          internal.producers.audioProducer.close();
        }

        if (options.producers.audio) {
          internal.producers.audioProducer = options.producers.audio;
          this.setupExternalProducerCloseHandler(
            streamId,
            'audio',
            options.producers.audio
          );

          pubsub.publishForChannel(this.id, ServerEvents.VOICE_NEW_PRODUCER, {
            channelId: this.id,
            remoteId: streamId,
            kind: StreamKind.EXTERNAL_AUDIO
          });
        } else {
          delete internal.producers.audioProducer;
        }
      }

      if (options.producers.video !== undefined) {
        if (
          internal.producers.videoProducer &&
          !internal.producers.videoProducer.closed
        ) {
          internal.producers.videoProducer.close();
        }

        if (options.producers.video) {
          internal.producers.videoProducer = options.producers.video;
          this.setupExternalProducerCloseHandler(
            streamId,
            'video',
            options.producers.video
          );

          pubsub.publishForChannel(this.id, ServerEvents.VOICE_NEW_PRODUCER, {
            channelId: this.id,
            remoteId: streamId,
            kind: StreamKind.EXTERNAL_VIDEO
          });
        } else {
          delete internal.producers.videoProducer;
        }
      }

      publicStream.tracks = {
        audio: !!internal.producers.audioProducer,
        video: !!internal.producers.videoProducer
      };
    }

    pubsub.publish(ServerEvents.VOICE_UPDATE_EXTERNAL_STREAM, {
      channelId: this.id,
      streamId,
      stream: publicStream
    });
  };

  public getExternalStreamProducer = (
    streamId: number,
    kind: 'audio' | 'video'
  ): Producer | undefined => {
    const internal = this.externalStreamsInternal[streamId];
    if (!internal) return undefined;

    return kind === 'audio'
      ? internal.producers.audioProducer
      : internal.producers.videoProducer;
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
      remoteExternalStreamIds: Object.keys(this.externalStreamsInternal).map(
        (id) => +id
      )
    };
  };

  public getExternalStreamTracks = (
    streamId: number
  ): { audio: boolean; video: boolean } => {
    const internal = this.externalStreamsInternal[streamId];
    if (!internal) return { audio: false, video: false };

    return {
      audio: !!internal.producers.audioProducer,
      video: !!internal.producers.videoProducer
    };
  };

  public static getListenInfo = () => {
    const info = getListenInfos();

    const ip = info[0]?.ip;
    const announcedAddress = info[0]?.announcedAddress;

    if (!ip) {
      throw new Error('No listen info available');
    }

    return { ip, announcedAddress };
  };
}

export { VoiceRuntime };
