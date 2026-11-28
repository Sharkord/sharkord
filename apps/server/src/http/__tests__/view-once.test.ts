import { ChannelPermission, UploadHeaders } from '@sharkord/shared';
import { describe, expect, test } from 'bun:test';
import { and, eq } from 'drizzle-orm';
import { initTest, sendViewOnceMessage } from '../../__tests__/helpers';
import { tdb, testsBaseUrl } from '../../__tests__/setup';
import {
  channelUserPermissions,
  fileViews,
  messageFiles,
  settings
} from '../../db/schema';
import { getRateLimit } from '../../helpers/rate-limits';
import { VIEW_ONCE_DOWNLOAD_WINDOW_MS } from '../view-once';

const fetchViewOnce = (fileId: number | string, token?: string) =>
  fetch(`${testsBaseUrl}/view-once/${fileId}`, {
    headers: token ? { [UploadHeaders.TOKEN]: token } : {}
  });

const RESTRICTED_CHANNEL_ID = 5;
const DM_CHANNEL_ID = 3;

describe('/view-once', () => {
  test('should serve the bytes to the user who just opened the file', async () => {
    const { fileId } = await sendViewOnceMessage(2);
    const { caller, mockedToken } = await initTest(1);

    await caller.messages.openViewOnce({ fileId });

    const response = await fetchViewOnce(fileId, mockedToken);

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(response.headers.get('content-disposition')).toBe('inline');
    expect(response.headers.get('content-security-policy')).toContain(
      'sandbox'
    );
    expect(await response.text()).toBe('view once bytes');
  });

  test('should not serve without a token', async () => {
    const { fileId } = await sendViewOnceMessage(2);
    const { caller } = await initTest(1);

    await caller.messages.openViewOnce({ fileId });

    const response = await fetchViewOnce(fileId);

    expect(response.status).toBe(404);
  });

  test('should not serve with an invalid token', async () => {
    const { fileId } = await sendViewOnceMessage(2);
    const { caller } = await initTest(1);

    await caller.messages.openViewOnce({ fileId });

    const response = await fetchViewOnce(fileId, 'not-a-token');

    expect(response.status).toBe(404);
  });

  test('should not serve a file the user has not opened', async () => {
    const { fileId } = await sendViewOnceMessage(2);
    const { mockedToken } = await initTest(1);

    const response = await fetchViewOnce(fileId, mockedToken);

    expect(response.status).toBe(404);
  });

  test('should not serve on the strength of another user opening it', async () => {
    const { fileId } = await sendViewOnceMessage(2);
    const { caller: opener } = await initTest(3);
    const { mockedToken } = await initTest(1);

    await opener.messages.openViewOnce({ fileId });

    const response = await fetchViewOnce(fileId, mockedToken);

    expect(response.status).toBe(404);
  });

  test('should not serve once the download window has passed', async () => {
    const { fileId } = await sendViewOnceMessage(2);
    const { caller, mockedToken } = await initTest(1);

    await caller.messages.openViewOnce({ fileId });

    await tdb
      .update(fileViews)
      .set({ createdAt: Date.now() - VIEW_ONCE_DOWNLOAD_WINDOW_MS - 1000 })
      .where(and(eq(fileViews.fileId, fileId), eq(fileViews.userId, 1)));

    const response = await fetchViewOnce(fileId, mockedToken);

    expect(response.status).toBe(404);
  });

  test('should not serve once the user can no longer see the channel', async () => {
    const { fileId } = await sendViewOnceMessage(1, RESTRICTED_CHANNEL_ID);
    const { caller, mockedToken } = await initTest(3);

    await caller.messages.openViewOnce({ fileId });

    const before = await fetchViewOnce(fileId, mockedToken);

    expect(before.status).toBe(200);
    await before.text();

    await tdb.insert(channelUserPermissions).values({
      channelId: RESTRICTED_CHANNEL_ID,
      userId: 3,
      permission: ChannelPermission.VIEW_CHANNEL,
      allow: false,
      createdAt: Date.now()
    });

    const response = await fetchViewOnce(fileId, mockedToken);

    expect(response.status).toBe(404);
  });

  test('should not serve a dm file once direct messages are disabled', async () => {
    const { fileId } = await sendViewOnceMessage(3, DM_CHANNEL_ID);
    const { caller, mockedToken } = await initTest(4);

    await caller.messages.openViewOnce({ fileId });

    const before = await fetchViewOnce(fileId, mockedToken);

    expect(before.status).toBe(200);
    await before.text();

    await tdb.update(settings).set({ directMessagesEnabled: false });

    const response = await fetchViewOnce(fileId, mockedToken);

    expect(response.status).toBe(404);
  });

  test('should not serve a file detached from its message', async () => {
    const { fileId } = await sendViewOnceMessage(2);
    const { caller, mockedToken } = await initTest(1);

    await caller.messages.openViewOnce({ fileId });
    await tdb.delete(messageFiles).where(eq(messageFiles.fileId, fileId));

    const response = await fetchViewOnce(fileId, mockedToken);

    expect(response.status).toBe(404);
  });

  test('should not serve a file that is not view once', async () => {
    const { mockedToken } = await initTest(1);

    await tdb
      .insert(fileViews)
      .values({ fileId: 1, userId: 1, createdAt: Date.now() });

    const response = await fetchViewOnce(1, mockedToken);

    expect(response.status).toBe(404);
  });

  test('should not serve an id that is not a number', async () => {
    const { mockedToken } = await initTest(1);

    const response = await fetchViewOnce('abc', mockedToken);

    expect(response.status).toBe(404);
  });

  test('should rate limit excessive downloads', async () => {
    const { fileId } = await sendViewOnceMessage(2);
    const { caller, mockedToken } = await initTest(1);
    const { maxRequests } = getRateLimit();
    const statuses: number[] = [];

    await caller.messages.openViewOnce({ fileId });

    for (let i = 0; i < maxRequests; i++) {
      const response = await fetchViewOnce(fileId, mockedToken);

      statuses.push(response.status);
      await response.text();
    }

    const response = await fetchViewOnce(fileId, mockedToken);
    const { error } = (await response.json()) as { error: string };

    expect(statuses.every((status) => status === 200)).toBe(true);
    expect(response.status).toBe(429);
    expect(error).toBe('Too many requests. Please try again shortly.');
  });

  test('should require the file id directly after the route prefix', async () => {
    const { fileId } = await sendViewOnceMessage(2);
    const { caller, mockedToken } = await initTest(1);

    await caller.messages.openViewOnce({ fileId });

    const response = await fetchViewOnce(`extra/${fileId}`, mockedToken);

    expect(response.status).toBe(404);
  });
});
