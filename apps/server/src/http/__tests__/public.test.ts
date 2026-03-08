import { ChannelType, type TFile, type TTempFile } from '@sharkord/shared';
import { describe, expect, test } from 'bun:test';
import { eq } from 'drizzle-orm';
import fs from 'fs/promises';
import { beforeEach } from 'node:test';
import path from 'path';
import { initTest, login, uploadFile } from '../../__tests__/helpers';
import { tdb, testsBaseUrl } from '../../__tests__/setup';
import { loadCrons } from '../../crons';
import { channels, files, messageFiles, messages } from '../../db/schema';
import { generateFileToken } from '../../helpers/files-crypto';
import { PUBLIC_PATH } from '../../helpers/paths';
import { fileManager } from '../../utils/file-manager';

const upload = async (file: File, token: string) => {
  const uploadResponse = await uploadFile(file, token);
  const uploadData = (await uploadResponse.json()) as TTempFile;

  return uploadData;
};

const getFileByMessageId = async (
  messageId: number
): Promise<TFile | undefined> => {
  const messageFile = await tdb
    .select()
    .from(messageFiles)
    .where(eq(messageFiles.messageId, messageId))
    .get();

  if (!messageFile) {
    return undefined;
  }

  const dbFile = await tdb
    .select()
    .from(files)
    .where(eq(files.id, messageFile.fileId))
    .get();

  return dbFile;
};

describe('/public', () => {
  const filesToCreate = [
    {
      name: 'test-public.txt',
      content: 'This is a test file for public endpoint.',
      messageId: null as number | null,
      tempFile: null as TTempFile | null
    },
    {
      name: 'another-test.txt',
      content: 'This is another test file.',
      messageId: null as number | null,
      tempFile: null as TTempFile | null
    },
    {
      name: 'orphan.txt',
      content: 'This is an orphaned file.',
      messageId: null as number | null,
      tempFile: null as TTempFile | null
    }
  ];

  let token: string;

  beforeEach(async () => {
    const response = await login('testowner', 'password123');
    const data = (await response.json()) as { token: string };

    token = data.token;

    for (const fileData of filesToCreate) {
      fileData.messageId = null;
      fileData.tempFile = null;
    }

    for (const fileData of filesToCreate) {
      const tempFile = await upload(
        new File([fileData.content], fileData.name, {
          type: 'text/plain'
        }),
        token
      );

      fileData.tempFile = tempFile;
    }

    // add first two files to messages to make them non-orphaned
    for (let i = 0; i < 2; i++) {
      const { caller } = await initTest();

      const messageId = await caller.messages.send({
        content: 'Message with file',
        channelId: 1,
        files: [filesToCreate[i]!.tempFile!.id]
      });

      filesToCreate[i]!.messageId = messageId;
    }

    // third we save manually as orphan
    await fileManager.saveFile(filesToCreate[2]!.tempFile!.id, 1);
  });

  test('files were created in public folder', async () => {
    for (const fileData of filesToCreate) {
      if (!fileData.messageId) continue;

      const dbFile = await getFileByMessageId(fileData.messageId);

      expect(dbFile).toBeDefined();

      const filePath = path.join(PUBLIC_PATH, dbFile!.name);

      expect(await fs.exists(filePath)).toBe(true);

      const content = await fs.readFile(filePath, 'utf-8');

      expect(content).toBe(fileData.content);
    }
  });

  test('should serve a file successfully', async () => {
    const file = filesToCreate[0];

    expect(file).toBeDefined();
    expect(file!.messageId).toBeDefined();

    const dbFile = await getFileByMessageId(file!.messageId!);

    expect(dbFile).toBeDefined();
    expect(dbFile?.name).toBeDefined();

    const response = await fetch(
      `${testsBaseUrl}/public/${encodeURIComponent(dbFile!.name)}`
    );

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toInclude('text/plain');
    expect(response.headers.get('Content-Length')).toBe(
      dbFile!.size.toString()
    );
    const disposition = response.headers.get('Content-Disposition');

    expect(disposition).toInclude(`filename="${dbFile!.name}"`);
    expect(disposition).toInclude(
      `filename*=UTF-8''${encodeURIComponent(dbFile!.name)}`
    );

    const responseText = await response.text();

    expect(responseText).toBe(file!.content);
  });

  test('should return 404 when file not found in database', async () => {
    const response = await fetch(`${testsBaseUrl}/public/nonexistent-file.txt`);

    expect(response.status).toBe(404);

    const data = (await response.json()) as { error: string };

    expect(data).toHaveProperty('error', 'File not found');
  });

  test('should return 404 when file is orphaned', async () => {
    const orphanFile = filesToCreate[2];

    expect(orphanFile).toBeDefined();
    expect(orphanFile!.tempFile).toBeDefined();
    expect(orphanFile!.messageId).toBeNull();

    const dbFile = await tdb
      .select()
      .from(files)
      .where(eq(files.md5, orphanFile!.tempFile!.md5))
      .get();

    expect(dbFile).toBeDefined();

    const response = await fetch(
      `${testsBaseUrl}/public/${encodeURIComponent(dbFile!.name)}`
    );

    expect(response.status).toBe(404);

    const data = (await response.json()) as { error: string };

    expect(data).toHaveProperty('error', 'File not found');
  });

  test('should return 404 when file exists in database but not on disk', async () => {
    const missingFileName = `test-missing-${Date.now()}.txt`;

    const [message] = await tdb
      .insert(messages)
      .values({
        userId: 1,
        channelId: 1,
        content: 'Message with missing file',
        createdAt: Date.now()
      })
      .returning();

    const [missingFile] = await tdb
      .insert(files)
      .values({
        name: missingFileName,
        originalName: 'missing.txt',
        md5: 'missing-md5',
        userId: 1,
        size: 100,
        mimeType: 'text/plain',
        extension: '.txt',
        createdAt: Date.now()
      })
      .returning();

    await tdb.insert(messageFiles).values({
      messageId: message!.id,
      fileId: missingFile!.id,
      createdAt: Date.now()
    });

    const response = await fetch(
      `${testsBaseUrl}/public/${encodeURIComponent(missingFileName)}`
    );

    expect(response.status).toBe(404);

    const data = (await response.json()) as { error: string };

    expect(data).toHaveProperty('error', 'File not found on disk');
  });

  test('should return 404 when URL is invalid', async () => {
    const response = await fetch(`${testsBaseUrl}/public/`);

    expect(response.status).toBe(404);
  });

  test('should delete file when message is deleted', async () => {
    const orphanFile = filesToCreate[0];

    const dbFile = await getFileByMessageId(orphanFile!.messageId!);

    expect(dbFile).toBeDefined();

    // file exists and it's linked to a message
    expect(await fs.exists(path.join(PUBLIC_PATH, dbFile!.name))).toBe(true);

    const { caller } = await initTest();

    await caller.messages.delete({
      messageId: orphanFile!.messageId!
    });

    const afterDbFile = await tdb
      .select()
      .from(files)
      .where(eq(files.id, dbFile!.id))
      .get();

    // file record is deleted
    expect(afterDbFile).toBeUndefined();

    // file is deleted from disk
    expect(await fs.exists(path.join(PUBLIC_PATH, dbFile!.name))).toBe(false);
  });

  test('should delete file inside message when channel is deleted', async () => {
    const orphanFile = filesToCreate[1];

    const dbFile = await getFileByMessageId(orphanFile!.messageId!);

    expect(dbFile).toBeDefined();

    // file exists and it's linked to a message
    expect(await fs.exists(path.join(PUBLIC_PATH, dbFile!.name))).toBe(true);

    const { caller } = await initTest();

    await caller.channels.delete({
      channelId: 1
    });

    // load crons here, it will run the file cleanup cron job
    await loadCrons();

    await Bun.sleep(1000); // wait a bit for cron to finish

    const afterDbFile = await tdb
      .select()
      .from(files)
      .where(eq(files.id, dbFile!.id))
      .get();

    // file record is deleted
    expect(afterDbFile).toBeUndefined();

    // file is deleted from disk
    expect(await fs.exists(path.join(PUBLIC_PATH, dbFile!.name))).toBe(false);
  });

  test('should return 403 when trying to access a private channel file without token', async () => {
    const { caller } = await initTest();

    const channelId = await caller.channels.add({
      name: 'Private Channel',
      categoryId: 1,
      type: ChannelType.TEXT
    });

    await caller.channels.update({
      channelId: channelId,
      private: true
    });

    const channel = await tdb
      .select()
      .from(channels)
      .where(eq(channels.id, channelId))
      .get();

    expect(channel).toBeDefined();
    expect(channel?.private).toBe(true);

    const tempFile = await upload(
      new File(['Private file content'], 'private-file.txt', {
        type: 'text/plain'
      }),
      token
    );

    const messageId = await caller.messages.send({
      content: 'Message with private file',
      channelId,
      files: [tempFile.id]
    });

    const dbFile = await getFileByMessageId(messageId);

    expect(dbFile).toBeDefined();

    const response = await fetch(
      `${testsBaseUrl}/public/${encodeURIComponent(dbFile!.name)}`
    );

    expect(response.status).toBe(403);

    const data = (await response.json()) as { error: string };

    expect(data).toHaveProperty('error', 'Forbidden');
  });

  test('should return 403 when trying to access a private channel file with invalid token', async () => {
    const { caller } = await initTest();

    const channelId = await caller.channels.add({
      name: 'Private Channel',
      categoryId: 1,
      type: ChannelType.TEXT
    });

    await caller.channels.update({
      channelId: channelId,
      private: true
    });

    const tempFile = await upload(
      new File(['Private file content'], 'private-file.txt', {
        type: 'text/plain'
      }),
      token
    );

    const messageId = await caller.messages.send({
      content: 'Message with private file',
      channelId,
      files: [tempFile.id]
    });

    const dbFile = await getFileByMessageId(messageId);

    expect(dbFile).toBeDefined();

    const response = await fetch(
      `${testsBaseUrl}/public/${encodeURIComponent(dbFile!.name)}?accessToken=invalid-token-xyz`
    );

    expect(response.status).toBe(403);

    const data = (await response.json()) as { error: string };

    expect(data).toHaveProperty('error', 'Forbidden');
  });

  test('should return 200 when accessing a private channel file with valid token', async () => {
    const { caller } = await initTest();

    const channelId = await caller.channels.add({
      name: 'Private Channel',
      categoryId: 1,
      type: ChannelType.TEXT
    });

    await caller.channels.update({
      channelId: channelId,
      private: true
    });

    const channel = await tdb
      .select()
      .from(channels)
      .where(eq(channels.id, channelId))
      .get();

    expect(channel).toBeDefined();
    expect(channel?.private).toBe(true);
    expect(channel?.fileAccessToken).toBeDefined();

    const fileContent = 'Private file content';
    const tempFile = await upload(
      new File([fileContent], 'private-file.txt', {
        type: 'text/plain'
      }),
      token
    );

    const messageId = await caller.messages.send({
      content: 'Message with private file',
      channelId,
      files: [tempFile.id]
    });

    const dbFile = await getFileByMessageId(messageId);

    expect(dbFile).toBeDefined();

    const validToken = generateFileToken(dbFile!.id, channel!.fileAccessToken);
    const response = await fetch(
      `${testsBaseUrl}/public/${encodeURIComponent(dbFile!.name)}?accessToken=${validToken}`
    );

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toInclude('text/plain');

    const responseText = await response.text();

    expect(responseText).toBe(fileContent);
  });

  test('should return 403 when using token from different channel', async () => {
    const { caller } = await initTest();

    const channelId1 = await caller.channels.add({
      name: 'Private Chan 1',
      categoryId: 1,
      type: ChannelType.TEXT
    });

    await caller.channels.update({
      channelId: channelId1,
      private: true
    });

    const channelId2 = await caller.channels.add({
      name: 'Private Chan 2',
      categoryId: 1,
      type: ChannelType.TEXT
    });

    await caller.channels.update({
      channelId: channelId2,
      private: true
    });

    const channel1 = await tdb
      .select()
      .from(channels)
      .where(eq(channels.id, channelId1))
      .get();

    const channel2 = await tdb
      .select()
      .from(channels)
      .where(eq(channels.id, channelId2))
      .get();

    expect(channel1).toBeDefined();
    expect(channel2).toBeDefined();
    expect(channel1?.fileAccessToken).not.toBe(channel2?.fileAccessToken);

    const tempFile = await upload(
      new File(['Private file content'], 'private-file.txt', {
        type: 'text/plain'
      }),
      token
    );

    const messageId = await caller.messages.send({
      content: 'Message with private file',
      channelId: channelId1,
      files: [tempFile.id]
    });

    const dbFile = await getFileByMessageId(messageId);

    expect(dbFile).toBeDefined();

    const wrongChannelToken = generateFileToken(
      dbFile!.id,
      channel2!.fileAccessToken
    );

    const response = await fetch(
      `${testsBaseUrl}/public/${encodeURIComponent(dbFile!.name)}?accessToken=${wrongChannelToken}`
    );

    expect(response.status).toBe(403);

    const data = (await response.json()) as { error: string };

    expect(data).toHaveProperty('error', 'Forbidden');
  });

  test('should allow access to public channel files without token', async () => {
    const { caller } = await initTest();

    const channelId = await caller.channels.add({
      name: 'Public Channel',
      categoryId: 1,
      type: ChannelType.TEXT
    });

    const channel = await tdb
      .select()
      .from(channels)
      .where(eq(channels.id, channelId))
      .get();

    expect(channel).toBeDefined();
    expect(channel?.private).toBe(false);

    const fileContent = 'Public file content';
    const tempFile = await upload(
      new File([fileContent], 'public-file.txt', {
        type: 'text/plain'
      }),
      token
    );

    const messageId = await caller.messages.send({
      content: 'Message with public file',
      channelId,
      files: [tempFile.id]
    });

    const dbFile = await getFileByMessageId(messageId);

    expect(dbFile).toBeDefined();

    const response = await fetch(
      `${testsBaseUrl}/public/${encodeURIComponent(dbFile!.name)}`
    );

    expect(response.status).toBe(200);

    const responseText = await response.text();

    expect(responseText).toBe(fileContent);
  });

  test('should allow access to non-message files without token', async () => {
    const file = filesToCreate[0];

    expect(file).toBeDefined();
    expect(file!.messageId).toBeDefined();

    const dbFile = await getFileByMessageId(file!.messageId!);

    expect(dbFile).toBeDefined();

    const response = await fetch(
      `${testsBaseUrl}/public/${encodeURIComponent(dbFile!.name)}`
    );

    expect(response.status).toBe(200);

    const responseText = await response.text();

    expect(responseText).toBe(file!.content);
  });

  test('should sanitize Content-Disposition header against injection', async () => {
    const file = filesToCreate[0];

    expect(file).toBeDefined();
    expect(file!.messageId).toBeDefined();

    const dbFile = await getFileByMessageId(file!.messageId!);

    expect(dbFile).toBeDefined();

    const response = await fetch(
      `${testsBaseUrl}/public/${encodeURIComponent(dbFile!.name)}`
    );

    expect(response.status).toBe(200);

    const disposition = response.headers.get('Content-Disposition');

    expect(disposition).toBeDefined();
    expect(disposition).not.toContain('\r');
    expect(disposition).not.toContain('\n');
    expect(disposition).toInclude("filename*=UTF-8''");
  });

  test('should not allow path traversal to read arbitrary files', async () => {
    const response = await fetch(`${testsBaseUrl}/public/../../../etc/passwd`);

    expect(response.status).toBe(404);
  });

  test('should include Accept-Ranges header on normal requests', async () => {
    const file = filesToCreate[0];
    const dbFile = await getFileByMessageId(file!.messageId!);

    const response = await fetch(
      `${testsBaseUrl}/public/${encodeURIComponent(dbFile!.name)}`
    );

    expect(response.status).toBe(200);
    expect(response.headers.get('Accept-Ranges')).toBe('bytes');
  });

  test('should return 206 Partial Content for valid Range request', async () => {
    const file = filesToCreate[0];
    const dbFile = await getFileByMessageId(file!.messageId!);
    const totalSize = dbFile!.size;

    // request first 5 bytes
    const response = await fetch(
      `${testsBaseUrl}/public/${encodeURIComponent(dbFile!.name)}`,
      {
        headers: { Range: 'bytes=0-4' }
      }
    );

    expect(response.status).toBe(206);
    expect(response.headers.get('Content-Range')).toBe(
      `bytes 0-4/${totalSize}`
    );
    expect(response.headers.get('Content-Length')).toBe('5');
    expect(response.headers.get('Accept-Ranges')).toBe('bytes');

    const body = await response.text();

    expect(body.length).toBe(5);
    expect(body).toBe(file!.content.slice(0, 5));
  });

  test('should return 206 for Range request with open end', async () => {
    const file = filesToCreate[0];
    const dbFile = await getFileByMessageId(file!.messageId!);
    const totalSize = dbFile!.size;

    // request from byte 5 to end
    const response = await fetch(
      `${testsBaseUrl}/public/${encodeURIComponent(dbFile!.name)}`,
      {
        headers: { Range: 'bytes=5-' }
      }
    );

    expect(response.status).toBe(206);
    expect(response.headers.get('Content-Range')).toBe(
      `bytes 5-${totalSize - 1}/${totalSize}`
    );
    expect(response.headers.get('Content-Length')).toBe(String(totalSize - 5));

    const body = await response.text();

    expect(body).toBe(file!.content.slice(5));
  });

  test('should return 206 for Range request of last byte', async () => {
    const file = filesToCreate[0];
    const dbFile = await getFileByMessageId(file!.messageId!);
    const totalSize = dbFile!.size;
    const lastByteIndex = totalSize - 1;

    const response = await fetch(
      `${testsBaseUrl}/public/${encodeURIComponent(dbFile!.name)}`,
      {
        headers: { Range: `bytes=${lastByteIndex}-${lastByteIndex}` }
      }
    );

    expect(response.status).toBe(206);
    expect(response.headers.get('Content-Length')).toBe('1');

    const body = await response.text();

    expect(body).toBe(file!.content.charAt(lastByteIndex));
  });

  test('should return 416 for Range request beyond file size', async () => {
    const file = filesToCreate[0];
    const dbFile = await getFileByMessageId(file!.messageId!);
    const totalSize = dbFile!.size;

    const response = await fetch(
      `${testsBaseUrl}/public/${encodeURIComponent(dbFile!.name)}`,
      {
        headers: { Range: `bytes=${totalSize}-${totalSize + 10}` }
      }
    );

    expect(response.status).toBe(416);
    expect(response.headers.get('Content-Range')).toBe(`bytes */${totalSize}`);
  });

  test('should return 416 for invalid Range format', async () => {
    const file = filesToCreate[0];
    const dbFile = await getFileByMessageId(file!.messageId!);
    const totalSize = dbFile!.size;

    const response = await fetch(
      `${testsBaseUrl}/public/${encodeURIComponent(dbFile!.name)}`,
      {
        headers: { Range: 'bytes=abc-def' }
      }
    );

    expect(response.status).toBe(416);
    expect(response.headers.get('Content-Range')).toBe(`bytes */${totalSize}`);
  });

  test('should return 416 when start > end in Range', async () => {
    const file = filesToCreate[0];
    const dbFile = await getFileByMessageId(file!.messageId!);
    const totalSize = dbFile!.size;

    const response = await fetch(
      `${testsBaseUrl}/public/${encodeURIComponent(dbFile!.name)}`,
      {
        headers: { Range: 'bytes=10-5' }
      }
    );

    expect(response.status).toBe(416);
    expect(response.headers.get('Content-Range')).toBe(`bytes */${totalSize}`);
  });

  test('should not allow encoded path traversal', async () => {
    const response = await fetch(
      `${testsBaseUrl}/public/${encodeURIComponent('../../../etc/passwd')}`
    );

    expect(response.status).toBe(404);

    const data = (await response.json()) as { error: string };

    expect(data).toHaveProperty('error', 'File not found');
  });
});
