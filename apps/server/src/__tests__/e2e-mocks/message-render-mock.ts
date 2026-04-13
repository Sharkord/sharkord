import { ChannelType, type TIMessage } from '@sharkord/shared';
import type { BunSQLiteDatabase } from 'drizzle-orm/bun-sqlite';
import { channels, messages } from '../../db/schema';

const bigImageUrl = 'https://i.imgur.com/ZaGQvmT.jpeg';
const videoUrl =
  'https://avtshare01.rz.tu-ilmenau.de/avt-vqdb-uhd-1/test_1/segments/bigbuck_bunny_8bit_15000kbps_1080p_60.0fps_h264.mp4';

const getRandomImagesList = async (count: number): Promise<string[]> => {
  try {
    const res = await fetch(
      `https://picsum.photos/v2/list?page=1&limit=${count}`
    );
    const data: any = await res.json();

    return data.map((item: { download_url: string }) => item.download_url);
  } catch {
    console.warn('Failed to fetch random images');

    return [];
  }
};

const interleaveArrays = <T>(arrays: T[][]): T[] => {
  const maxLength = Math.max(...arrays.map((arr) => arr.length));
  const interleaved: T[] = [];

  for (let i = 0; i < maxLength; i++) {
    for (const arr of arrays) {
      if (i < arr.length) {
        interleaved.push(arr[i]!);
      }
    }
  }

  return interleaved;
};

const createMockMessageArrayWithImages = async (
  channelId: number,
  totalMessages: number
): Promise<TIMessage[]> => {
  const messagesArray: TIMessage[] = [];
  const baseCreatedAt = Date.now() - totalMessages * 60 * 1000;
  const randomImages = await getRandomImagesList(200);

  for (let i = 0; i < totalMessages; i++) {
    const randomIndex = Math.floor(Math.random() * randomImages.length);
    const imageUrl = randomImages[randomIndex];

    messagesArray.push({
      channelId,
      userId: 1,
      content: `<p>${`${i}_<br>`.repeat(500)}</p>`,
      createdAt: baseCreatedAt + i * 60 * 1000,
      metadata: [
        {
          url: bigImageUrl,
          title: 'ZaGQvmT.jpeg',
          description: '',
          mediaType: 'image'
        },
        {
          url: imageUrl!,
          title: `Random Image ${randomIndex}`,
          description: '',
          mediaType: 'image'
        }
      ]
    });
  }

  return messagesArray;
};

const createMockMessageArrayWithVideo = (
  channelId: number,
  totalMessages: number
): TIMessage[] => {
  const messagesArray: TIMessage[] = [];

  const baseCreatedAt = Date.now() - totalMessages * 60 * 1000;

  for (let i = 0; i < totalMessages; i++) {
    messagesArray.push({
      channelId,
      userId: 1,
      content: `<p><a target="_blank" rel="noopener noreferrer" href="${videoUrl}">${videoUrl}</a></p>`,
      createdAt: baseCreatedAt + i * 60 * 1000,
      metadata: [
        {
          url: videoUrl,
          title: 'bigbuck_bunny_8bit_15000kbps_1080p_60.0fps_h264.mp4',
          description: '',
          mediaType: 'video'
        }
      ]
    });
  }

  return messagesArray;
};

const messageRenderMock = async (
  db: BunSQLiteDatabase,
  e2eChannelsCategoryId: number
) => {
  const scrollChannel = await db
    .insert(channels)
    .values({
      name: 'Messages Render',
      type: ChannelType.TEXT,
      position: 1,
      categoryId: e2eChannelsCategoryId,
      createdAt: Date.now()
    })
    .returning()
    .get();

  const allMockMessages = interleaveArrays([
    await createMockMessageArrayWithImages(scrollChannel!.id, 500),
    createMockMessageArrayWithVideo(scrollChannel!.id, 500)
  ]);

  const totalMockMessages = allMockMessages.length;
  const messagesPerGroup = 5;
  const intraGroupSpacingMs = 10 * 1000;
  const groupSpacingMs = 2 * 60 * 1000;
  const totalGroups = Math.ceil(totalMockMessages / messagesPerGroup);
  const baseCreatedAt = Date.now() - totalGroups * groupSpacingMs;

  const mockMessages = Array.from({ length: totalMockMessages }).map(
    (_, index) => {
      const groupIndex = Math.floor(index / messagesPerGroup);
      const indexWithinGroup = index % messagesPerGroup;
      const message = allMockMessages[index];

      const mockMessage: TIMessage = {
        ...message,
        channelId: scrollChannel!.id,
        createdAt:
          baseCreatedAt +
          groupIndex * groupSpacingMs +
          indexWithinGroup * intraGroupSpacingMs
      };

      return mockMessage;
    }
  );

  await db.insert(messages).values(mockMessages);
};

export { messageRenderMock };
