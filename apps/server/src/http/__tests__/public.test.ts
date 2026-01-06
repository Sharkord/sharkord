import type { TFile, TTempFile } from '@sharkord/shared';
import { describe, expect, test } from 'bun:test';
import { eq } from 'drizzle-orm';
import fs from 'node:fs/promises';
import { beforeEach } from 'node:test';
import path from 'path';
import { initTest, login, uploadFile } from '../../__tests__/helpers';
import { tdb, testsBaseUrl } from '../../__tests__/setup';
import { loadCrons } from '../../crons';
import { files, messageFiles, messages } from '../../db/schema';
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
    expect(response.headers.get('Content-Disposition')).toBe(
      `inline; filename="${dbFile!.name}"`
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
});
