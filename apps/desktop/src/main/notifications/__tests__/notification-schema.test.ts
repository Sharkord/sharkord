import { describe, expect, test } from 'bun:test';
import { notificationSchema } from '../notification-schema';

const VALID = {
  title: 'Ana in #general',
  body: 'hello there',
  icon: 'https://chat.example.com/public/ana.png',
  target: { channelId: 3, messageId: 42, isDm: false }
};

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
        target: { messageId: 42, isDm: false }
      }).success
    ).toBe(false);
    expect(
      notificationSchema.safeParse({
        ...VALID,
        target: { channelId: 3, isDm: false }
      }).success
    ).toBe(false);
  });
});
