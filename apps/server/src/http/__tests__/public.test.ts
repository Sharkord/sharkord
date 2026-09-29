import { ChannelType, type TFile, type TTempFile } from '@sharkord/shared';
import { beforeEach, describe, expect, test } from 'bun:test';
import { eq } from 'drizzle-orm';
import fs from 'fs/promises';
import path from 'path';
import { initTest, login, uploadFile } from '../../__tests__/helpers';
import { tdb, testsBaseUrl } from '../../__tests__/setup';
import { loadCrons } from '../../crons';
import { cleanupFiles } from '../../crons/cleanup-files';
import {
  channels,
  files,
  messageFiles,
  messages,
  settings
} from '../../db/schema';
import { fileManager } from '../../helpers/file-manager';
import { generateFileToken } from '../../helpers/files-crypto';
import { PUBLIC_PATH } from '../../helpers/paths';

const upload = async (file: File, token: string) => {
  const uploadResponse = await uploadFile(file, token);
  const uploadData = (await uploadResponse.json()) as TTempFile;

  return uploadData;
};

const uploadToMessage = async (
  name: string,
  content: string,
  token: string
) => {
  const tempFile = await upload(
    new File([content], name, { type: 'text/plain' }),
    token
  );

  const { caller } = await initTest();

  const messageId = await caller.messages.send({
    content: 'Message with file',
    channelId: 1,
    files: [tempFile.id]
  });

  return (await getFileByMessageId(messageId))!;
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

const enableSignedUrls = async (ttlSeconds: number = 3600) => {
  await tdb.update(settings).set({
    storageSignedUrlsEnabled: true,
    storageSignedUrlsTtlSeconds: ttlSeconds
  });
};

const disableSignedUrls = async () => {
  await tdb.update(settings).set({
    storageSignedUrlsEnabled: false
  });
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

    expect(disposition).toInclude(`filename="${dbFile!.originalName}"`);
    expect(disposition).toInclude(
      `filename*=UTF-8''${encodeURIComponent(dbFile!.originalName)}`
    );

    const responseText = await response.text();

    expect(responseText).toBe(file!.content);
  });

  test('should return 404 when file not found in database', async () => {
    const response = await fetch(`${testsBaseUrl}/public/nonexistent-file.txt`);

    expect(response.status).toBe(404);
    expect(response.headers.get('Cache-Control')).toBe('no-store');

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

    // the cleanup cron skips recently created files so it cannot race an upload
    // that has not been linked yet, so this one is aged past that window
    await tdb
      .update(files)
      .set({ createdAt: Date.now() - 60 * 60 * 1000 })
      .where(eq(files.id, dbFile!.id));

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

  test('should not clean up a file that was just created', async () => {
    // the third fixture is saved without ever being linked to a message, which
    // is exactly the state a file is in between saveFile and the statement that
    // links it
    const dbFile = await tdb
      .select()
      .from(files)
      .where(eq(files.originalName, 'orphan.txt'))
      .get();

    expect(dbFile).toBeDefined();

    await cleanupFiles();

    const afterDbFile = await tdb
      .select()
      .from(files)
      .where(eq(files.id, dbFile!.id))
      .get();

    expect(afterDbFile).toBeDefined();
    expect(await fs.exists(path.join(PUBLIC_PATH, dbFile!.name))).toBe(true);
  });

  test('should allow access to private channel files without token when signed URLs disabled', async () => {
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

    const response = await fetch(
      `${testsBaseUrl}/public/${encodeURIComponent(dbFile!.name)}`
    );

    expect(response.status).toBe(200);

    const responseText = await response.text();

    expect(responseText).toBe(fileContent);
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

  test.each([
    ['Отчёт за март.txt', '_____ __ ____.txt'],
    ['報告.txt', '__.txt'],
    ['it’s €5.txt', 'it_s _5.txt'],
    ['niño.txt', 'ni_o.txt']
  ])(
    'should serve a file named %s with an ascii fallback name',
    async (name, fallbackName) => {
      const content = 'non ascii name';
      const tempFile = await upload(
        new File([content], name, { type: 'text/plain' }),
        token
      );

      const { caller } = await initTest();

      const messageId = await caller.messages.send({
        content: 'Message with file',
        channelId: 1,
        files: [tempFile.id]
      });

      const dbFile = await getFileByMessageId(messageId);

      expect(dbFile?.originalName).toBe(name);

      const response = await fetch(
        `${testsBaseUrl}/public/${encodeURIComponent(dbFile!.name)}`
      );

      expect(response.status).toBe(200);

      const disposition = response.headers.get('Content-Disposition');

      expect(disposition).toInclude(`filename="${fallbackName}"`);
      expect(disposition).toInclude(
        `filename*=UTF-8''${encodeURIComponent(name)}`
      );
      expect(await response.text()).toBe(content);
    }
  );

  test('should not overwrite a file that exists on disk but not in the database', async () => {
    await fs.writeFile(path.join(PUBLIC_PATH, 'disk-only.txt'), 'existing');

    const dbFile = await uploadToMessage('disk-only.txt', 'new', token);

    expect(dbFile.name).toBe('disk-only-2.txt');
    expect(
      await fs.readFile(path.join(PUBLIC_PATH, 'disk-only.txt'), 'utf-8')
    ).toBe('existing');
    expect(
      await fs.readFile(path.join(PUBLIC_PATH, dbFile.name), 'utf-8')
    ).toBe('new');
  });

  test.each([
    ['que?.txt', 'que_.txt'],
    ['say "hi".txt', 'say _hi_.txt'],
    ['a|b<c>:d*.txt', 'a_b_c__d_.txt'],
    ['tab\there.txt', 'tab_here.txt'],
    ['notes.t?t', 'notes.t_t'],
    ['a:b.txt', 'a_b.txt']
  ])(
    'should store %s on disk without characters windows reserves',
    async (name, diskName) => {
      const dbFile = await uploadToMessage(name, 'reserved chars', token);

      expect(dbFile.name).toBe(diskName);
      expect(dbFile.originalName).toBe(name);

      const response = await fetch(
        `${testsBaseUrl}/public/${encodeURIComponent(dbFile.name)}`
      );

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Disposition')).toInclude(
        `filename*=UTF-8''${encodeURIComponent(name)}`
      );
      expect(await response.text()).toBe('reserved chars');
    }
  );

  test('should truncate names longer than 255 utf-8 bytes on disk', async () => {
    const name = `${'Д'.repeat(200)}.txt`;

    const first = await uploadToMessage(name, 'long name', token);
    const second = await uploadToMessage(name, 'long name', token);

    // two bytes per letter: 125 letters plus '.txt' is 254 bytes, 124 plus '-2.txt' is 254
    expect(first.name).toBe(`${'Д'.repeat(125)}.txt`);
    expect(second.name).toBe(`${'Д'.repeat(124)}-2.txt`);
    expect(first.originalName).toBe(name);

    const response = await fetch(
      `${testsBaseUrl}/public/${encodeURIComponent(first.name)}`
    );

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Disposition')).toInclude(
      `filename*=UTF-8''${encodeURIComponent(name)}`
    );
  });

  test('should truncate an extension longer than 32 bytes', async () => {
    const name = `notes.${'я'.repeat(200)}`;

    const dbFile = await uploadToMessage(name, 'long extension', token);

    expect(dbFile.name).toBe(`notes.${'я'.repeat(15)}`);
    expect(dbFile.extension).toBe(`.${'я'.repeat(15)}`);
    expect(dbFile.originalName).toBe(name);

    const response = await fetch(
      `${testsBaseUrl}/public/${encodeURIComponent(dbFile.name)}`
    );

    expect(response.status).toBe(200);
    expect(await response.text()).toBe('long extension');
  });

  test.each([
    ['\uFEFFbom.txt', 'bom.txt'],
    ['\uFEFF\uFEFFdouble-bom.txt', 'double-bom.txt'],
    ['\uFFFEreversed-bom.txt', 'reversed-bom.txt'],
    ['\uFEFF\uFFFEmixed-bom.txt', 'mixed-bom.txt']
  ])(
    'should serve a file whose name starts with byte order marks (%#)',
    async (name, storedName) => {
      const dbFile = await uploadToMessage(name, 'bom', token);

      expect(dbFile.name).toBe(storedName);
      expect(dbFile.originalName).toBe(storedName);

      const response = await fetch(`${testsBaseUrl}/public/${storedName}`);

      expect(response.status).toBe(200);
      expect(await response.text()).toBe('bom');
    }
  );

  test('should not let a trailing backslash escape the fallback file name', async () => {
    const pluginFile = await fileManager.savePluginFile(
      'test-plugin',
      'trail\\',
      new TextEncoder().encode('plugin file')
    );

    await tdb.insert(messageFiles).values({
      messageId: filesToCreate[0]!.messageId!,
      fileId: pluginFile.id,
      createdAt: Date.now()
    });

    expect(pluginFile.name).toBe('trail_');

    const response = await fetch(
      `${testsBaseUrl}/public/${encodeURIComponent(pluginFile.name)}`
    );

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Disposition')).toInclude(
      `filename="trail_"; filename*=UTF-8''trail%5C`
    );
  });

  test.each(['%E0%A4%A', '%', '%ZZ', '%C0%AF'])(
    'should return 400 for the malformed escape %s',
    async (encoded) => {
      const response = await fetch(`${testsBaseUrl}/public/${encoded}`);

      expect(response.status).toBe(400);

      const data = (await response.json()) as { error: string };

      expect(data).toHaveProperty('error', 'Invalid URL encoding');
    }
  );

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

  test('should include cache validators and public cache policy on normal requests', async () => {
    const file = filesToCreate[0];
    const dbFile = await getFileByMessageId(file!.messageId!);

    const response = await fetch(
      `${testsBaseUrl}/public/${encodeURIComponent(dbFile!.name)}`
    );

    expect(response.status).toBe(200);
    expect(response.headers.get('ETag')).toBeDefined();
    expect(response.headers.get('Last-Modified')).toBeDefined();
    expect(response.headers.get('Cache-Control')).toBe(
      'public, max-age=3600, must-revalidate'
    );
    expect(response.headers.get('Vary')).toBe('Range');
  });

  test('should return 304 when If-None-Match matches ETag', async () => {
    const file = filesToCreate[0];
    const dbFile = await getFileByMessageId(file!.messageId!);

    const firstResponse = await fetch(
      `${testsBaseUrl}/public/${encodeURIComponent(dbFile!.name)}`
    );
    const etag = firstResponse.headers.get('ETag');

    expect(firstResponse.status).toBe(200);
    expect(etag).toBeDefined();

    const secondResponse = await fetch(
      `${testsBaseUrl}/public/${encodeURIComponent(dbFile!.name)}`,
      {
        headers: {
          'If-None-Match': etag!
        }
      }
    );

    expect(secondResponse.status).toBe(304);
    expect(secondResponse.headers.get('ETag')).toBe(etag);

    const body = await secondResponse.text();

    expect(body).toBe('');
  });

  test('should return 304 when If-Modified-Since is current Last-Modified value', async () => {
    const file = filesToCreate[0];
    const dbFile = await getFileByMessageId(file!.messageId!);

    const firstResponse = await fetch(
      `${testsBaseUrl}/public/${encodeURIComponent(dbFile!.name)}`
    );
    const lastModified = firstResponse.headers.get('Last-Modified');

    expect(firstResponse.status).toBe(200);
    expect(lastModified).toBeDefined();

    const secondResponse = await fetch(
      `${testsBaseUrl}/public/${encodeURIComponent(dbFile!.name)}`,
      {
        headers: {
          'If-Modified-Since': lastModified!
        }
      }
    );

    expect(secondResponse.status).toBe(304);
    expect(secondResponse.headers.get('Last-Modified')).toBe(lastModified);
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

  test('should prefer range response over 304 when Range and If-None-Match are both present', async () => {
    const file = filesToCreate[0];
    const dbFile = await getFileByMessageId(file!.messageId!);

    const firstResponse = await fetch(
      `${testsBaseUrl}/public/${encodeURIComponent(dbFile!.name)}`
    );
    const etag = firstResponse.headers.get('ETag');

    expect(etag).toBeDefined();

    const response = await fetch(
      `${testsBaseUrl}/public/${encodeURIComponent(dbFile!.name)}`,
      {
        headers: {
          Range: 'bytes=0-4',
          'If-None-Match': etag!
        }
      }
    );

    expect(response.status).toBe(206);
    expect(response.headers.get('Content-Length')).toBe('5');
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

  test('should return 403 when signed URLs enabled and no token provided', async () => {
    const file = filesToCreate[0];

    expect(file).toBeDefined();
    expect(file!.messageId).toBeDefined();

    const dbFile = await getFileByMessageId(file!.messageId!);

    expect(dbFile).toBeDefined();

    await enableSignedUrls();

    const response = await fetch(
      `${testsBaseUrl}/public/${encodeURIComponent(dbFile!.name)}`
    );

    expect(response.status).toBe(403);
    expect(response.headers.get('Cache-Control')).toBe('no-store');

    const data = (await response.json()) as { error: string };

    expect(data).toHaveProperty('error', 'Forbidden');

    await disableSignedUrls();
  });

  test('should return 403 when signed URLs enabled and only accessToken provided without expires', async () => {
    const file = filesToCreate[0];
    const dbFile = await getFileByMessageId(file!.messageId!);

    expect(dbFile).toBeDefined();

    await enableSignedUrls();

    const response = await fetch(
      `${testsBaseUrl}/public/${encodeURIComponent(dbFile!.name)}?accessToken=some-token`
    );

    expect(response.status).toBe(403);

    await disableSignedUrls();
  });

  test('should return 403 when signed URLs enabled and only expires provided without accessToken', async () => {
    const file = filesToCreate[0];
    const dbFile = await getFileByMessageId(file!.messageId!);

    expect(dbFile).toBeDefined();

    await enableSignedUrls();

    const expiresAt = Date.now() + 3600000;

    const response = await fetch(
      `${testsBaseUrl}/public/${encodeURIComponent(dbFile!.name)}?expires=${expiresAt}`
    );

    expect(response.status).toBe(403);

    await disableSignedUrls();
  });

  test('should return 200 when signed URLs enabled and valid token + expires provided', async () => {
    const file = filesToCreate[0];
    const dbFile = await getFileByMessageId(file!.messageId!);

    expect(dbFile).toBeDefined();

    await enableSignedUrls();

    const expiresAt = Date.now() + 3600000;
    const validToken = generateFileToken(dbFile!.id, expiresAt);

    const response = await fetch(
      `${testsBaseUrl}/public/${encodeURIComponent(dbFile!.name)}?accessToken=${validToken}&expires=${expiresAt}`
    );

    expect(response.status).toBe(200);

    const cacheControl = response.headers.get('Cache-Control');

    expect(cacheControl).toBeDefined();
    expect(cacheControl).toInclude('private');
    expect(cacheControl).toInclude('must-revalidate');

    const maxAgeMatch = cacheControl!.match(/max-age=(\d+)/);

    expect(maxAgeMatch).toBeDefined();
    expect(Number(maxAgeMatch![1]!)).toBeLessThanOrEqual(300);

    const responseText = await response.text();

    expect(responseText).toBe(file!.content);

    await disableSignedUrls();
  });

  test('should return 403 when signed URLs enabled and token is expired', async () => {
    const file = filesToCreate[0];
    const dbFile = await getFileByMessageId(file!.messageId!);

    expect(dbFile).toBeDefined();

    await enableSignedUrls();

    // set expires to 1 second in the past
    const expiresAt = Date.now() - 1000;
    const validToken = generateFileToken(dbFile!.id, expiresAt);

    const response = await fetch(
      `${testsBaseUrl}/public/${encodeURIComponent(dbFile!.name)}?accessToken=${validToken}&expires=${expiresAt}`
    );

    expect(response.status).toBe(403);

    await disableSignedUrls();
  });

  test('should return 403 when signed URLs enabled and invalid token provided', async () => {
    const file = filesToCreate[0];
    const dbFile = await getFileByMessageId(file!.messageId!);

    expect(dbFile).toBeDefined();

    await enableSignedUrls();

    const expiresAt = Date.now() + 3600000;

    const response = await fetch(
      `${testsBaseUrl}/public/${encodeURIComponent(dbFile!.name)}?accessToken=invalid-token&expires=${expiresAt}`
    );

    expect(response.status).toBe(403);

    await disableSignedUrls();
  });

  test('should return 403 when signed URLs enabled and expires is not a valid number', async () => {
    const file = filesToCreate[0];
    const dbFile = await getFileByMessageId(file!.messageId!);

    expect(dbFile).toBeDefined();

    await enableSignedUrls();

    const response = await fetch(
      `${testsBaseUrl}/public/${encodeURIComponent(dbFile!.name)}?accessToken=some-token&expires=not-a-number`
    );

    expect(response.status).toBe(403);

    await disableSignedUrls();
  });

  test('should enforce signed URLs on public channel files when enabled', async () => {
    const { caller } = await initTest();

    const channelId = await caller.channels.add({
      name: 'Public Channel',
      categoryId: 1,
      type: ChannelType.TEXT
    });

    const fileContent = 'Public file for signed URL test';
    const tempFile = await upload(
      new File([fileContent], 'signed-public-file.txt', {
        type: 'text/plain'
      }),
      token
    );

    const messageId = await caller.messages.send({
      content: 'Message with file',
      channelId,
      files: [tempFile.id]
    });

    const dbFile = await getFileByMessageId(messageId);

    expect(dbFile).toBeDefined();

    // without signed URLs, public channel file should be accessible
    const responseWithout = await fetch(
      `${testsBaseUrl}/public/${encodeURIComponent(dbFile!.name)}`
    );

    expect(responseWithout.status).toBe(200);

    // enable signed URLs
    await enableSignedUrls();

    // now it should be blocked without token
    const responseBlocked = await fetch(
      `${testsBaseUrl}/public/${encodeURIComponent(dbFile!.name)}`
    );

    expect(responseBlocked.status).toBe(403);

    // with valid token it should work
    const expiresAt = Date.now() + 3600000;
    const validToken = generateFileToken(dbFile!.id, expiresAt);

    const responseWithToken = await fetch(
      `${testsBaseUrl}/public/${encodeURIComponent(dbFile!.name)}?accessToken=${validToken}&expires=${expiresAt}`
    );

    expect(responseWithToken.status).toBe(200);

    const responseText = await responseWithToken.text();

    expect(responseText).toBe(fileContent);

    await disableSignedUrls();
  });

  test('should enforce signed URLs on non-message files (e.g. avatars) when enabled', async () => {
    // create a file that is not attached to a message but is linked (e.g. via a user avatar)
    const { caller } = await initTest();

    const tempFile = await upload(
      new File(['avatar content'], 'avatar.png', {
        type: 'image/png'
      }),
      token
    );

    // link it to the user as avatar so it's not orphaned
    await caller.users.changeAvatar({
      fileId: tempFile.id
    });

    const dbFile = await tdb
      .select()
      .from(files)
      .where(eq(files.md5, tempFile.md5))
      .get();

    expect(dbFile).toBeDefined();

    // without signed URLs, file should be accessible
    const responseWithout = await fetch(
      `${testsBaseUrl}/public/${encodeURIComponent(dbFile!.name)}`
    );

    expect(responseWithout.status).toBe(200);

    // enable signed URLs
    await enableSignedUrls();

    // now it should be blocked without token
    const responseBlocked = await fetch(
      `${testsBaseUrl}/public/${encodeURIComponent(dbFile!.name)}`
    );

    expect(responseBlocked.status).toBe(403);

    // with valid token it should work
    const expiresAt = Date.now() + 3600000;
    const validToken = generateFileToken(dbFile!.id, expiresAt);

    const responseWithToken = await fetch(
      `${testsBaseUrl}/public/${encodeURIComponent(dbFile!.name)}?accessToken=${validToken}&expires=${expiresAt}`
    );

    expect(responseWithToken.status).toBe(200);

    await disableSignedUrls();
  });

  test('should allow access to files without token when signed URLs are disabled', async () => {
    await disableSignedUrls();

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
});
