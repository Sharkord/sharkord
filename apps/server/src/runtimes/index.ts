import { ChannelType } from '@sharkord/shared';
import { eq } from 'drizzle-orm';
import { db } from '../db';
import { channels } from '../db/schema';
import { VoiceRuntime } from './voice';

const initVoiceRuntimes = async () => {
  const voiceChannels = await db
    .select({
      id: channels.id
    })
    .from(channels)
    .where(eq(channels.type, ChannelType.VOICE));

  for (const channel of voiceChannels) {
    const runtime = new VoiceRuntime(channel.id);

    await runtime.init();
  }
};

export { initVoiceRuntimes };
