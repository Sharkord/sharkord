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

  test('leaves out inline icons that are not images or are too large', () => {
    const notImage = notificationSchema.parse({
      ...VALID,
      icon: 'data:text/html;base64,PGgxPmhpPC9oMT4='
    });
    const tooLarge = notificationSchema.parse({
      ...VALID,
      icon: `data:image/png;base64,${'A'.repeat(600_000)}`
    });

    expect(notImage.icon).toBeUndefined();
    expect(notImage.title).toBe(VALID.title);
    expect(tooLarge.icon).toBeUndefined();
  });

  test('leaves out icons that are not web addresses', () => {
    const file = notificationSchema.parse({
      ...VALID,
      icon: 'file:///etc/passwd'
    });
    const blob = notificationSchema.parse({
      ...VALID,
      icon: 'blob:https://chat.example.com/1234'
    });

    expect(file.icon).toBeUndefined();
    expect(blob.icon).toBeUndefined();
    expect(blob.body).toBe(VALID.body);
  });

  test('cuts text longer than a notification can sensibly show', () => {
    const { title, body } = notificationSchema.parse({
      ...VALID,
      title: 'a'.repeat(500),
      body: 'b'.repeat(5000)
    });

    expect(title).toBe(`${'a'.repeat(199)}…`);
    expect(body).toBe(`${'b'.repeat(999)}…`);
  });

  test('keeps text that fits as it is', () => {
    const { title, body } = notificationSchema.parse({
      ...VALID,
      title: 'a'.repeat(200),
      body: 'b'.repeat(1000)
    });

    expect(title).toBe('a'.repeat(200));
    expect(body).toBe('b'.repeat(1000));
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
