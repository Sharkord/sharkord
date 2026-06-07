import {
  ServerEvents,
  StreamKind,
  type TChannelState,
  type TExternalStreamsMap,
  type TRemoteProducerIds,
  type TStreamQualityLayer,
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
  WebRtcTransport
} from 'mediasoup/types';
import { config } from '../config';
import { logger } from '../logger';
import { eventBus } from '../plugins/event-bus';
import {
  mediaSoupWorker,
  webRtcServer,
  webRtcServerListenInfo
} from '../utils/mediasoup';
import { pubsub } from '../utils/pubsub';

const voiceRuntimes = new Map<number, VoiceRuntime>();

const defaultRouterOptions: RouterOptions<AppData> = {
  mediaCodecs: [
    {
      kind: 'video',
      mimeType: 'video/VP9',
      clockRate: 90000,
      parameters: {
        'profile-id': 0,
        'x-google-start-bitrate': 2000
      }
    },
    {
      kind: 'video',
      mimeType: 'video/VP8',
      clockRate: 90000,
      parameters: {
        'x-google-start-bitrate': 2000
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
        'x-google-start-bitrate': 2000
      }
    },
    {
      kind: 'video',
      mimeType: 'video/H264',
      clockRate: 90000,
      parameters: {
        'packetization-mode': 1,
        'profile-level-id': '640032',
        'level-asymmetry-allowed': 1,
        'x-google-start-bitrate': 2000
      }
    },
    {
      kind: 'video',
      mimeType: 'video/AV1',
      clockRate: 90000,
      parameters: {
        'x-google-start-bitrate': 2000
      }
    },
    {
      kind: 'audio',
      mimeType: 'audio/opus',
      clockRate: 48000,
      channels: 2,
      parameters: {
        useinbandfec: 1,
        usedtx: 1,
        stereo: 1,
        'sprop-stereo': 1,
        maxplaybackrate: 48000,
        maxaveragebitrate: 128000
      }
    }
  ]
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
    [streamKey: string]: Consumer<AppData>;
  };
};

type TProducerQualityLayerMap = {
  [producerKey: string]: TStreamQualityLayer[];
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
  bannerUrl?: string;
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
  private screenAudioProducers: TProducerMap = {};
  private consumers: TConsumerMap = {};
  private producerQualityLayers: TProducerQualityLayerMap = {};

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

  private getConsumerKey = (remoteId: number, kind: StreamKind) => {
    return `${remoteId}-${kind}`;
  };

  private getProducerKey = (remoteId: number, kind: StreamKind) => {
    return `${remoteId}-${kind}`;
  };

  private validateProducerQualityLayers = (
    producer: Producer<AppData> | undefined,
    qualityLayers?: TStreamQualityLayer[]
  ): TStreamQualityLayer[] => {
    if (!producer || producer.kind !== 'video') {
      if (qualityLayers !== undefined) {
        throw new Error('Quality layers can only be set for video producers');
      }

      return [];
    }

    if (producer.type !== 'simulcast') {
      if (qualityLayers !== undefined) {
        throw new Error(
          'Quality layers can only be set for simulcast producers'
        );
      }

      return [];
    }

    const expectedLayerCount = producer.rtpParameters.encodings?.length ?? 0;

    if (!qualityLayers?.length) {
      throw new Error('Simulcast video producers require quality layer labels');
    }

    if (qualityLayers.length !== expectedLayerCount) {
      throw new Error(
        'Quality layer count must match simulcast encoding count'
      );
    }

    const seenLayers = new Set<number>();
    const normalizedLayers = qualityLayers.map((layer) => {
      const label = layer.label.trim();

      if (!label) {
        throw new Error('Quality layer labels cannot be empty');
      }

      if (!Number.isInteger(layer.spatialLayer) || layer.spatialLayer < 0) {
        throw new Error(
          'Quality layer spatialLayer must be a non-negative integer'
        );
      }

      if (seenLayers.has(layer.spatialLayer)) {
        throw new Error('Quality layer spatialLayer values must be unique');
      }

      seenLayers.add(layer.spatialLayer);

      return {
        spatialLayer: layer.spatialLayer,
        label
      };
    });

    for (let layer = 0; layer < expectedLayerCount; layer++) {
      if (!seenLayers.has(layer)) {
        throw new Error(
          'Quality layer spatialLayer values must match encoding indexes'
        );
      }
    }

    return normalizedLayers.sort((a, b) => a.spatialLayer - b.spatialLayer);
  };

  private setProducerQualityLayers = (
    remoteId: number,
    kind: StreamKind,
    layers: TStreamQualityLayer[]
  ) => {
    const producerKey = this.getProducerKey(remoteId, kind);

    if (layers.length === 0) {
      delete this.producerQualityLayers[producerKey];
      return;
    }

    this.producerQualityLayers[producerKey] = layers;
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

    Object.values(this.screenAudioProducers).forEach((producer) => {
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

    eventBus.emit('user:joined_voice', {
      userId: userId,
      channelId: this.id
    });
  };

  public removeUser = (userId: number) => {
    this.state.users = this.state.users.filter((u) => u.userId !== userId);

    this.cleanupUserResources(userId);

    eventBus.emit('user:left_voice', {
      userId: userId,
      channelId: this.id
    });
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

      if (consumerId === userId) return;

      const userConsumers = this.consumers[consumerId];

      Object.keys(userConsumers ?? {}).forEach((streamKey) => {
        if (!userConsumers) return;
        if (!streamKey.startsWith(`${userId}-`)) return;

        userConsumers[streamKey]?.close();

        delete userConsumers[streamKey];
      });
    });
  };

  public getConsumer = (userId: number, remoteId: number, kind: StreamKind) => {
    return this.consumers[userId]?.[this.getConsumerKey(remoteId, kind)];
  };

  public getConsumerById = (userId: number, consumerId: string) => {
    const userConsumers = this.consumers[userId];

    if (!userConsumers) return undefined;

    return Object.values(userConsumers).find(
      (consumer) => consumer.id === consumerId
    );
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

    const maxBitrate = config.webRtc.maxBitrate;

    const transport = await router.createWebRtcTransport({
      webRtcServer,
      enableUdp: true,
      enableTcp: true,
      preferUdp: true,
      preferTcp: false,
      initialAvailableOutgoingBitrate: Math.min(10000000, maxBitrate)
    });

    await transport.setMaxIncomingBitrate(maxBitrate);
    await transport.setMaxOutgoingBitrate(maxBitrate);

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
      case StreamKind.SCREEN_AUDIO:
        return this.screenAudioProducers[id];
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
    producer: Producer,
    qualityLayers?: TStreamQualityLayer[]
  ) => {
    const validatedQualityLayers = this.validateProducerQualityLayers(
      producer,
      qualityLayers
    );

    if (type === StreamKind.VIDEO) {
      this.videoProducers[userId] = producer;
    } else if (type === StreamKind.AUDIO) {
      this.audioProducers[userId] = producer;
    } else if (type === StreamKind.SCREEN) {
      this.screenProducers[userId] = producer;
    } else if (type === StreamKind.SCREEN_AUDIO) {
      this.screenAudioProducers[userId] = producer;
    }

    this.setProducerQualityLayers(userId, type, validatedQualityLayers);

    producer.observer.on('close', () => {
      if (type === StreamKind.VIDEO) {
        delete this.videoProducers[userId];
      } else if (type === StreamKind.AUDIO) {
        delete this.audioProducers[userId];
      } else if (type === StreamKind.SCREEN) {
        delete this.screenProducers[userId];
      } else if (type === StreamKind.SCREEN_AUDIO) {
        delete this.screenAudioProducers[userId];
      }

      this.setProducerQualityLayers(userId, type, []);
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
      case StreamKind.SCREEN_AUDIO:
        producer = this.screenAudioProducers[userId];
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
    } else if (type === StreamKind.SCREEN_AUDIO) {
      delete this.screenAudioProducers[userId];
    }

    this.setProducerQualityLayers(userId, type, []);
  }

  public getProducerQualityLayers = (remoteId: number, kind: StreamKind) => {
    return (
      this.producerQualityLayers[this.getProducerKey(remoteId, kind)] ?? []
    );
  };

  public addConsumer = (
    userId: number,
    remoteId: number,
    kind: StreamKind,
    consumer: Consumer<AppData>
  ) => {
    if (!this.consumers[userId]) {
      this.consumers[userId] = {};
    }

    const streamKey = this.getConsumerKey(remoteId, kind);

    this.consumers[userId][streamKey] = consumer;

    consumer.observer.on('close', () => {
      delete this.consumers[userId]?.[streamKey];
    });
  };

  public createExternalStream = (options: {
    title: string;
    key: string;
    pluginId: string;
    avatarUrl?: string;
    bannerUrl?: string;
    producers: {
      audio?: Producer;
      video?: Producer;
    };
    videoLayers?: TStreamQualityLayer[];
  }) => {
    const streamId = this.externalCounter++;

    const { title, key, pluginId, avatarUrl, bannerUrl, producers } = options;

    const validatedVideoLayers = this.validateProducerQualityLayers(
      producers.video,
      options.videoLayers
    );

    this.externalStreamsInternal[streamId] = {
      title,
      key,
      pluginId,
      avatarUrl,
      bannerUrl,
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
      this.setProducerQualityLayers(
        streamId,
        StreamKind.EXTERNAL_VIDEO,
        validatedVideoLayers
      );
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
      bannerUrl,
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
        this.setProducerQualityLayers(streamId, StreamKind.EXTERNAL_VIDEO, []);
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

    this.setProducerQualityLayers(streamId, StreamKind.EXTERNAL_VIDEO, []);

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
      bannerUrl?: string;
      producers?: {
        audio?: Producer;
        video?: Producer;
      };
      videoLayers?: TStreamQualityLayer[];
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

    if (options.bannerUrl !== undefined) {
      internal.bannerUrl = options.bannerUrl;
      publicStream.bannerUrl = options.bannerUrl;
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
        const validatedVideoLayers = this.validateProducerQualityLayers(
          options.producers.video,
          options.videoLayers
        );

        if (
          internal.producers.videoProducer &&
          !internal.producers.videoProducer.closed
        ) {
          internal.producers.videoProducer.close();
        }

        if (options.producers.video) {
          internal.producers.videoProducer = options.producers.video;
          this.setProducerQualityLayers(
            streamId,
            StreamKind.EXTERNAL_VIDEO,
            validatedVideoLayers
          );
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
          this.setProducerQualityLayers(
            streamId,
            StreamKind.EXTERNAL_VIDEO,
            []
          );
        }
      }

      publicStream.tracks = {
        audio: !!internal.producers.audioProducer,
        video: !!internal.producers.videoProducer
      };
    }

    if (options.videoLayers !== undefined && !options.producers?.video) {
      const validatedVideoLayers = this.validateProducerQualityLayers(
        internal.producers.videoProducer,
        options.videoLayers
      );

      this.setProducerQualityLayers(
        streamId,
        StreamKind.EXTERNAL_VIDEO,
        validatedVideoLayers
      );
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
      remoteScreenAudioIds: Object.keys(this.screenAudioProducers).map(
        (id) => +id
      ),
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
    return {
      ip: webRtcServerListenInfo.ip,
      announcedAddress: webRtcServerListenInfo.announcedAddress
    };
  };
}

export { VoiceRuntime };
