import { describe, expect, test } from 'bun:test';
import { notificationSchema } from '../notification-schema';

const VALID = {
  title: 'Ana in #general',
  body: 'hello there',
  icon: 'https://chat.example.com/public/ana.png',
  target: { type: 'message', channelId: 3, messageId: 42, isDm: false }
};

const PNG_DATA_URL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

describe('notification schema', () => {
  test('accepts a message notification', () => {
    expect(notificationSchema.safeParse(VALID).success).toBe(true);
  });

  test('accepts a thread reply without an icon', () => {
    const { icon: _icon, ...withoutIcon } = VALID;

    expect(
      notificationSchema.safeParse({
        ...withoutIcon,
        target: { ...VALID.target, parentMessageId: 7 }
      }).success
    ).toBe(true);
  });

  test('accepts a notification that leads nowhere, like a test notification', () => {
    const { target: _target, ...withoutTarget } = VALID;

    expect(notificationSchema.safeParse(withoutTarget).success).toBe(true);
  });

  test('accepts a plugin notification with its data and an inline icon', () => {
    expect(
      notificationSchema.safeParse({
        ...VALID,
        icon: PNG_DATA_URL,
        target: {
          type: 'plugin',
          pluginId: 'weather',
          data: { city: 'Lisbon' }
        }
      }).success
    ).toBe(true);
  });

  test('rejects plugin data too large to carry around', () => {
    expect(
      notificationSchema.safeParse({
        ...VALID,
        target: { type: 'plugin', pluginId: 'weather', data: 'a'.repeat(5000) }
      }).success
    ).toBe(false);
  });

  test('rejects a target of an unknown type', () => {
    expect(
      notificationSchema.safeParse({
        ...VALID,
        target: { type: 'url', href: 'https://example.com' }
      }).success
    ).toBe(false);
  });

  test('rejects inline icons that are not images or are too large', () => {
    expect(
      notificationSchema.safeParse({
        ...VALID,
        icon: 'data:text/html;base64,PGgxPmhpPC9oMT4='
      }).success
    ).toBe(false);
    expect(
      notificationSchema.safeParse({
        ...VALID,
        icon: `data:image/png;base64,${'A'.repeat(600_000)}`
      }).success
    ).toBe(false);
  });

  test('rejects icons that are not web addresses', () => {
    expect(
      notificationSchema.safeParse({ ...VALID, icon: 'file:///etc/passwd' })
        .success
    ).toBe(false);
    expect(
      notificationSchema.safeParse({ ...VALID, icon: 'not a url' }).success
    ).toBe(false);
  });

  test('rejects text longer than a notification can sensibly show', () => {
    expect(
      notificationSchema.safeParse({ ...VALID, title: 'a'.repeat(201) }).success
    ).toBe(false);
    expect(
      notificationSchema.safeParse({ ...VALID, body: 'a'.repeat(1001) }).success
    ).toBe(false);
  });

  test('rejects a target without a channel or a message', () => {
    expect(
      notificationSchema.safeParse({
        ...VALID,
        target: { type: 'message', messageId: 42, isDm: false }
      }).success
    ).toBe(false);
    expect(
      notificationSchema.safeParse({
        ...VALID,
        target: { type: 'message', channelId: 3, isDm: false }
      }).success
    ).toBe(false);
  });
});
