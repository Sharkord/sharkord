import { afterEach, describe, expect, mock, test } from 'bun:test';
import {
  clearVoiceControlsBridge,
  setVoiceControlsBridge,
  startScreenShareFromBridge
} from '../controls-bridge';

describe('startScreenShareFromBridge', () => {
  afterEach(() => clearVoiceControlsBridge());

  test('delegates a screen-share start to the active voice provider', () => {
    const startScreenShare = mock(async () => {});

    setVoiceControlsBridge({
      setMicMuted: async () => {},
      setSoundMuted: async () => {},
      startScreenShare
    });

    expect(startScreenShareFromBridge()).toBe(true);
    expect(startScreenShare).toHaveBeenCalledTimes(1);
  });

  test('reports unavailable when no voice provider is mounted', () => {
    clearVoiceControlsBridge();

    expect(startScreenShareFromBridge()).toBe(false);
  });
});
