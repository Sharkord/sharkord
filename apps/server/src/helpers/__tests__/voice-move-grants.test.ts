import { describe, expect, test } from 'bun:test';
import {
  consumeVoiceMoveGrant,
  grantVoiceMove,
  hasVoiceMoveGrant
} from '../voice-move-grants';

const MOVE_GRANT_TTL_MS = 30_000;

describe('voice move grants', () => {
  test('should hold the grant until it is consumed', () => {
    grantVoiceMove(1, 10);

    expect(hasVoiceMoveGrant(1, 10)).toBe(true);
    expect(hasVoiceMoveGrant(1, 10)).toBe(true);

    consumeVoiceMoveGrant(1);

    expect(hasVoiceMoveGrant(1, 10)).toBe(false);
  });

  test('should survive a join that was refused after the check', () => {
    grantVoiceMove(6, 10);

    // the join is checked before it can fail on the channel or on the user still being in
    // the call they were moved out of, so a refusal must leave the grant to be retried
    expect(hasVoiceMoveGrant(6, 10)).toBe(true);
    expect(hasVoiceMoveGrant(6, 10)).toBe(true);
  });

  test('should survive a join aimed at a different channel', () => {
    grantVoiceMove(2, 10);

    // joining elsewhere inside the window used to delete the grant, so the move the user was
    // actually sent on then failed its permission check
    expect(hasVoiceMoveGrant(2, 99)).toBe(false);
    expect(hasVoiceMoveGrant(2, 10)).toBe(true);
  });

  test('should refuse a grant that has aged out', () => {
    grantVoiceMove(3, 10);

    const realNow = Date.now;

    Date.now = () => realNow() + MOVE_GRANT_TTL_MS + 1;

    try {
      expect(hasVoiceMoveGrant(3, 10)).toBe(false);
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

    // the sweep itself is not observable from out here, an aged-out entry that was left in
    // place reads the same as one that was removed. what is checked is that neither is usable
    expect(hasVoiceMoveGrant(4, 10)).toBe(false);
    expect(hasVoiceMoveGrant(5, 20)).toBe(true);
  });
});
