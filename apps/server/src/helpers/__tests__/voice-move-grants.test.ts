import { describe, expect, test } from 'bun:test';
import { consumeVoiceMoveGrant, grantVoiceMove } from '../voice-move-grants';

const MOVE_GRANT_TTL_MS = 30_000;

describe('voice move grants', () => {
  test('should let the destination channel consume the grant once', () => {
    grantVoiceMove(1, 10);

    expect(consumeVoiceMoveGrant(1, 10)).toBe(true);
    expect(consumeVoiceMoveGrant(1, 10)).toBe(false);
  });

  test('should survive a join aimed at a different channel', () => {
    grantVoiceMove(2, 10);

    // joining elsewhere inside the window used to delete the grant, so the move the user was
    // actually sent on then failed its permission check
    expect(consumeVoiceMoveGrant(2, 99)).toBe(false);
    expect(consumeVoiceMoveGrant(2, 10)).toBe(true);
  });

  test('should refuse a grant that has aged out', () => {
    grantVoiceMove(3, 10);

    const realNow = Date.now;

    Date.now = () => realNow() + MOVE_GRANT_TTL_MS + 1;

    try {
      expect(consumeVoiceMoveGrant(3, 10)).toBe(false);
    } finally {
      Date.now = realNow;
    }
  });

  test('should drop aged-out grants rather than hold them forever', () => {
    const realNow = Date.now;

    grantVoiceMove(4, 10);

    // a user who is moved and never joins leaves the only entry nothing else removes, so
    // issuing the next grant has to be what clears it
    Date.now = () => realNow() + MOVE_GRANT_TTL_MS + 1;

    try {
      grantVoiceMove(5, 20);
    } finally {
      Date.now = realNow;
    }

    // gone entirely: a still-present entry would come back as an expired false instead, which
    // reads the same from here, so the sweep is checked by the grant no longer existing at all
    expect(consumeVoiceMoveGrant(4, 10)).toBe(false);
    expect(consumeVoiceMoveGrant(5, 20)).toBe(true);
  });
});
