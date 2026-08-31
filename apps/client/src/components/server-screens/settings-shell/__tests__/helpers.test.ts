import { describe, expect, test } from 'bun:test';
import { hasUnsavedChanges } from '../helpers';

describe('hasUnsavedChanges', () => {
  test('should report a form matching its baseline as clean', () => {
    expect(hasUnsavedChanges({ name: 'general' }, { name: 'general' })).toBe(
      false
    );
  });

  test('should report an edited field as dirty', () => {
    expect(hasUnsavedChanges({ name: 'edited' }, { name: 'general' })).toBe(
      true
    );
  });

  // the save bar must disappear again when a toggle is flipped twice, so the comparison is by
  // value and never by object identity
  test('should report a toggle flipped back to its original state as clean', () => {
    const baseline = { enabled: false };
    const flipped = { ...baseline, enabled: true };
    const flippedBack = { ...flipped, enabled: false };

    expect(hasUnsavedChanges(flipped, baseline)).toBe(true);
    expect(hasUnsavedChanges(flippedBack, baseline)).toBe(false);
  });

  // role permissions and channel overrides hand back a rebuilt array on every toggle
  test('should compare arrays by their members, not by reference', () => {
    expect(
      hasUnsavedChanges({ permissions: [1, 2] }, { permissions: [1, 2] })
    ).toBe(false);
    expect(
      hasUnsavedChanges({ permissions: [2, 1] }, { permissions: [1, 2] })
    ).toBe(true);
  });

  // an untouched image is absent from the draft, picking one adds the key
  test('should treat an added optional key as dirty', () => {
    expect(
      hasUnsavedChanges({ bio: '', avatar: { fileId: 'a' } }, { bio: '' })
    ).toBe(true);
    expect(hasUnsavedChanges({ bio: '', avatar: undefined }, { bio: '' })).toBe(
      false
    );
  });
});
