import type { TTempFile } from '@sharkord/shared';
import { describe, expect, test } from 'bun:test';
import { initTest, uploadFile } from '../../__tests__/helpers';

describe('emojis router', () => {
  test('should throw when user lacks permissions (add)', async () => {
    const { caller } = await initTest(2);

    await expect(
      caller.emojis.add([
        {
          fileId: 'test-file-id',
          name: 'test_emoji'
        }
      ])
    ).rejects.toThrow('Insufficient permissions');
  });

  test('should throw when user lacks permissions (getAll)', async () => {
    const { caller } = await initTest(2);

    await expect(caller.emojis.getAll()).rejects.toThrow(
      'Insufficient permissions'
    );
  });

  test('should throw when user lacks permissions (update)', async () => {
    const { caller } = await initTest(2);

    await expect(
      caller.emojis.update({
        emojiId: 1,
        name: 'updated_emoji'
      })
    ).rejects.toThrow('Insufficient permissions');
  });

  test('should throw when user lacks permissions (delete)', async () => {
    const { caller } = await initTest(2);

    await expect(
      caller.emojis.delete({
        emojiId: 1
      })
    ).rejects.toThrow('Insufficient permissions');
  });

  test('should get all emojis', async () => {
    const { caller } = await initTest();

    const emojis = await caller.emojis.getAll();

    expect(emojis).toBeDefined();
    expect(Array.isArray(emojis)).toBe(true);
  });

  test('should add a single emoji', async () => {
    const { caller, mockedToken } = await initTest();

    const file = new File(['emoji content'], 'emoji.png', {
      type: 'image/png'
    });

    const uploadResponse = await uploadFile(file, mockedToken);
    const uploadData = (await uploadResponse.json()) as TTempFile;

    await caller.emojis.add([
      {
        fileId: uploadData.id,
        name: 'test_emoji'
      }
    ]);

    const emojis = await caller.emojis.getAll();
    const addedEmoji = emojis.find((e) => e.name === 'test_emoji');

    expect(addedEmoji).toBeDefined();
    expect(addedEmoji!.name).toBe('test_emoji');
    expect(addedEmoji!.fileId).toBeDefined();
    expect(addedEmoji!.userId).toBe(1);
  });

  test('should add multiple emojis at once', async () => {
    const { caller, mockedToken } = await initTest();

    const file1 = new File(['emoji 1'], 'emoji1.png', { type: 'image/png' });
    const file2 = new File(['emoji 2'], 'emoji2.png', { type: 'image/png' });

    const upload1 = await uploadFile(file1, mockedToken);
    const upload2 = await uploadFile(file2, mockedToken);

    const data1 = (await upload1.json()) as TTempFile;
    const data2 = (await upload2.json()) as TTempFile;

    await caller.emojis.add([
      {
        fileId: data1.id,
        name: 'emoji_one'
      },
      {
        fileId: data2.id,
        name: 'emoji_two'
      }
    ]);

    const emojis = await caller.emojis.getAll();

    expect(emojis.find((e) => e.name === 'emoji_one')).toBeDefined();
    expect(emojis.find((e) => e.name === 'emoji_two')).toBeDefined();
  });

  test('should generate unique emoji name if duplicate', async () => {
    const { caller, mockedToken } = await initTest();

    const file1 = new File(['emoji 1'], 'emoji1.png', { type: 'image/png' });
    const file2 = new File(['emoji 2'], 'emoji2.png', { type: 'image/png' });

    const upload1 = await uploadFile(file1, mockedToken);
    const upload2 = await uploadFile(file2, mockedToken);

    const data1 = (await upload1.json()) as TTempFile;
    const data2 = (await upload2.json()) as TTempFile;

    await caller.emojis.add([
      {
        fileId: data1.id,
        name: 'duplicate_name'
      }
    ]);

    await caller.emojis.add([
      {
        fileId: data2.id,
        name: 'duplicate_name'
      }
    ]);

    const emojis = await caller.emojis.getAll();
    const duplicateEmojis = emojis.filter((e) =>
      e.name.startsWith('duplicate_name')
    );

    expect(duplicateEmojis.length).toBe(2);
    expect(duplicateEmojis[0]!.name).not.toBe(duplicateEmojis[1]!.name);
  });

  test('should update emoji name', async () => {
    const { caller, mockedToken } = await initTest();

    const file = new File(['emoji content'], 'emoji.png', {
      type: 'image/png'
    });

    const uploadResponse = await uploadFile(file, mockedToken);
    const uploadData = (await uploadResponse.json()) as TTempFile;

    await caller.emojis.add([
      {
        fileId: uploadData.id,
        name: 'original_name'
      }
    ]);

    const emojis = await caller.emojis.getAll();
    const emoji = emojis.find((e) => e.name === 'original_name');

    expect(emoji).toBeDefined();

    await caller.emojis.update({
      emojiId: emoji!.id,
      name: 'updated_name'
    });

    const updatedEmojis = await caller.emojis.getAll();
    const updatedEmoji = updatedEmojis.find((e) => e.id === emoji!.id);

    expect(updatedEmoji).toBeDefined();
    expect(updatedEmoji!.name).toBe('updated_name');
    expect(
      updatedEmojis.find((e) => e.name === 'original_name')
    ).toBeUndefined();
  });

  test('should throw when updating emoji to existing name', async () => {
    const { caller, mockedToken } = await initTest();

    const file1 = new File(['emoji 1'], 'emoji1.png', { type: 'image/png' });
    const file2 = new File(['emoji 2'], 'emoji2.png', { type: 'image/png' });

    const upload1 = await uploadFile(file1, mockedToken);
    const upload2 = await uploadFile(file2, mockedToken);

    const data1 = (await upload1.json()) as TTempFile;
    const data2 = (await upload2.json()) as TTempFile;

    await caller.emojis.add([
      {
        fileId: data1.id,
        name: 'emoji_first'
      },
      {
        fileId: data2.id,
        name: 'emoji_second'
      }
    ]);

    const emojis = await caller.emojis.getAll();
    const secondEmoji = emojis.find((e) => e.name === 'emoji_second');

    await expect(
      caller.emojis.update({
        emojiId: secondEmoji!.id,
        name: 'emoji_first'
      })
    ).rejects.toThrow('An emoji with this name already exists');
  });

  test('should throw when updating non-existing emoji', async () => {
    const { caller } = await initTest();

    await expect(
      caller.emojis.update({
        emojiId: 999,
        name: 'non_existing'
      })
    ).rejects.toThrow('Emoji not found');
  });

  test('should delete emoji', async () => {
    const { caller, mockedToken } = await initTest();

    const file = new File(['emoji to delete'], 'emoji.png', {
      type: 'image/png'
    });

    const uploadResponse = await uploadFile(file, mockedToken);
    const uploadData = (await uploadResponse.json()) as TTempFile;

    await caller.emojis.add([
      {
        fileId: uploadData.id,
        name: 'emoji_to_delete'
      }
    ]);

    const emojis = await caller.emojis.getAll();
    const emoji = emojis.find((e) => e.name === 'emoji_to_delete');

    expect(emoji).toBeDefined();

    await caller.emojis.delete({
      emojiId: emoji!.id
    });

    const remainingEmojis = await caller.emojis.getAll();

    expect(remainingEmojis.find((e) => e.id === emoji!.id)).toBeUndefined();
  });

  test('should throw when deleting non-existing emoji', async () => {
    const { caller } = await initTest();

    await expect(
      caller.emojis.delete({
        emojiId: 999
      })
    ).rejects.toThrow('Emoji not found');
  });

  test('should preserve emoji fileId after update', async () => {
    const { caller, mockedToken } = await initTest();

    const file = new File(['emoji'], 'emoji.png', { type: 'image/png' });

    const uploadResponse = await uploadFile(file, mockedToken);
    const uploadData = (await uploadResponse.json()) as TTempFile;

    await caller.emojis.add([
      {
        fileId: uploadData.id,
        name: 'test_emoji'
      }
    ]);

    const emojis = await caller.emojis.getAll();
    const emoji = emojis.find((e) => e.name === 'test_emoji');
    const originalFileId = emoji!.fileId;

    await caller.emojis.update({
      emojiId: emoji!.id,
      name: 'updated_emoji'
    });

    const updatedEmojis = await caller.emojis.getAll();
    const updatedEmoji = updatedEmojis.find((e) => e.id === emoji!.id);

    expect(updatedEmoji!.fileId).toBe(originalFileId);
  });
});
