import { SoundType } from '../types';

const audioCtx = new (window.AudioContext ||
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).webkitAudioContext)();

const SOUNDS_VOLUME = 2;

const now = () => audioCtx.currentTime;

const createOsc = (type: OscillatorType, freq: number) => {
  const osc = audioCtx.createOscillator();

  osc.type = type;
  osc.frequency.setValueAtTime(freq, now());

  return osc;
};

const createGain = (value = 1) => {
  const gain = audioCtx.createGain();

  gain.gain.setValueAtTime(value * SOUNDS_VOLUME, now());

  return gain;
};

// MESSAGE_RECEIVED — ultra-minimal single tone
const sfxMessageReceived = () => {
  const osc = createOsc('sine', 600);
  const gain = createGain(0.05);

  gain.gain.exponentialRampToValueAtTime(0.0001, now() + 0.05);

  osc.connect(gain).connect(audioCtx.destination);
  osc.start();
  osc.stop(now() + 0.05);
};

// MESSAGE_SENT — ultra-minimal single tone (slightly higher)
const sfxMessageSent = () => {
  const osc = createOsc('sine', 750);
  const gain = createGain(0.04);

  gain.gain.exponentialRampToValueAtTime(0.0001, now() + 0.04);

  osc.connect(gain).connect(audioCtx.destination);
  osc.start();
  osc.stop(now() + 0.04);
};

// OWN_USER_JOINED_VOICE_CHANNEL — rich chord progression
const sfxOwnUserJoinedVoiceChannel = () => {
  // First chord (C major feel)
  const chord1 = [
    { freq: 523, gain: 0.09 }, // C
    { freq: 659, gain: 0.07 }, // E
    { freq: 784, gain: 0.06 } // G
  ];

  chord1.forEach(({ freq, gain: g }) => {
    const osc = createOsc('sine', freq);
    const gain = createGain(g);

    gain.gain.exponentialRampToValueAtTime(0.0001, now() + 0.25);

    osc.connect(gain).connect(audioCtx.destination);
    osc.start();
    osc.stop(now() + 0.25);
  });

  // Second chord overlapping (add brightness)
  const chord2 = [
    { freq: 1046, gain: 0.04 }, // C (octave up)
    { freq: 1318, gain: 0.03 } // E (octave up)
  ];

  chord2.forEach(({ freq, gain: g }) => {
    const osc = createOsc('triangle', freq);
    const gain = createGain(g);

    gain.gain.exponentialRampToValueAtTime(0.0001, now() + 0.3);

    osc.connect(gain).connect(audioCtx.destination);
    osc.start(now() + 0.08);
    osc.stop(now() + 0.3);
  });
};

// OWN_USER_LEFT_VOICE_CHANNEL — soft chord fade
const sfxOwnUserLeftVoiceChannel = () => {
  // Main chord (minor feel)
  const chord1 = [
    { freq: 440, gain: 0.09 }, // A
    { freq: 523, gain: 0.07 }, // C
    { freq: 659, gain: 0.06 } // E
  ];

  chord1.forEach(({ freq, gain: g }) => {
    const osc = createOsc('sine', freq);
    const gain = createGain(g);

    gain.gain.exponentialRampToValueAtTime(0.0001, now() + 0.3);

    osc.connect(gain).connect(audioCtx.destination);
    osc.start();
    osc.stop(now() + 0.3);
  });

  // Subtle harmonic layer
  const osc2 = createOsc('triangle', 880);
  const gain2 = createGain(0.04);

  gain2.gain.exponentialRampToValueAtTime(0.0001, now() + 0.25);

  osc2.connect(gain2).connect(audioCtx.destination);
  osc2.start(now() + 0.05);
  osc2.stop(now() + 0.3);
};

// MUTED_MIC — extremely bland low click
const sfxOwnUserMutedMic = () => {
  const osc = createOsc('sine', 350);
  const gain = createGain(0.05);

  gain.gain.exponentialRampToValueAtTime(0.0001, now() + 0.06);

  osc.connect(gain).connect(audioCtx.destination);
  osc.start();
  osc.stop(now() + 0.06);
};

// UNMUTED_MIC — extremely bland slightly higher click
const sfxOwnUserUnmutedMic = () => {
  const osc = createOsc('sine', 500);
  const gain = createGain(0.05);

  gain.gain.exponentialRampToValueAtTime(0.0001, now() + 0.06);

  osc.connect(gain).connect(audioCtx.destination);
  osc.start();
  osc.stop(now() + 0.06);
};

// MUTED_SOUND — bland mid-low tone
const sfxOwnUserMutedSound = () => {
  const osc = createOsc('sine', 450);
  const gain = createGain(0.05);

  gain.gain.exponentialRampToValueAtTime(0.0001, now() + 0.06);

  osc.connect(gain).connect(audioCtx.destination);
  osc.start();
  osc.stop(now() + 0.06);
};

// UNMUTED_SOUND — bland mid-high tone
const sfxOwnUserUnmutedSound = () => {
  const osc = createOsc('sine', 650);
  const gain = createGain(0.05);

  gain.gain.exponentialRampToValueAtTime(0.0001, now() + 0.06);

  osc.connect(gain).connect(audioCtx.destination);
  osc.start();
  osc.stop(now() + 0.06);
};

// STARTED_WEBCAM — subtle layered activation
const sfxOwnUserStartedWebcam = () => {
  const osc1 = createOsc('sine', 700);
  const gain1 = createGain(0.07);

  gain1.gain.exponentialRampToValueAtTime(0.0001, now() + 0.12);

  osc1.connect(gain1).connect(audioCtx.destination);
  osc1.start();
  osc1.stop(now() + 0.12);

  const osc2 = createOsc('sine', 900);
  const gain2 = createGain(0.04);

  gain2.gain.exponentialRampToValueAtTime(0.0001, now() + 0.1);

  osc2.connect(gain2).connect(audioCtx.destination);
  osc2.start(now() + 0.04);
  osc2.stop(now() + 0.12);
};

// STOPPED_WEBCAM — subtle layered deactivation
const sfxOwnUserStoppedWebcam = () => {
  const osc1 = createOsc('sine', 700);
  const gain1 = createGain(0.07);

  osc1.frequency.exponentialRampToValueAtTime(500, now() + 0.12);
  gain1.gain.exponentialRampToValueAtTime(0.0001, now() + 0.14);

  osc1.connect(gain1).connect(audioCtx.destination);
  osc1.start();
  osc1.stop(now() + 0.14);
};

// STARTED_SCREENSHARE — richer activation sequence
const sfxOwnUserStartedScreenshare = () => {
  // Main pulse sequence
  const pulses = [
    { freq: 600, delay: 0 },
    { freq: 800, delay: 0.06 },
    { freq: 1000, delay: 0.12 }
  ];

  pulses.forEach(({ freq, delay }) => {
    const t = now() + delay;
    const osc = createOsc('sine', freq);
    const gain = createGain(0.08);

    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.1);

    osc.connect(gain).connect(audioCtx.destination);
    osc.start(t);
    osc.stop(t + 0.1);
  });

  // Harmonic layer
  const osc2 = createOsc('triangle', 1200);
  const gain2 = createGain(0.03);

  gain2.gain.exponentialRampToValueAtTime(0.0001, now() + 0.2);

  osc2.connect(gain2).connect(audioCtx.destination);
  osc2.start(now() + 0.08);
  osc2.stop(now() + 0.22);
};

// STOPPED_SCREENSHARE — richer deactivation
const sfxOwnUserStoppedScreenshare = () => {
  const osc1 = createOsc('sine', 900);
  const gain1 = createGain(0.08);

  osc1.frequency.exponentialRampToValueAtTime(550, now() + 0.18);
  gain1.gain.exponentialRampToValueAtTime(0.0001, now() + 0.2);

  osc1.connect(gain1).connect(audioCtx.destination);
  osc1.start();
  osc1.stop(now() + 0.2);

  const osc2 = createOsc('triangle', 1100);
  const gain2 = createGain(0.03);

  osc2.frequency.exponentialRampToValueAtTime(700, now() + 0.18);
  gain2.gain.exponentialRampToValueAtTime(0.0001, now() + 0.2);

  osc2.connect(gain2).connect(audioCtx.destination);
  osc2.start(now() + 0.05);
  osc2.stop(now() + 0.2);
};

// REMOTE JOIN — layered uplifting tones
const sfxRemoteUserJoinedVoiceChannel = () => {
  const tones = [
    { freq: 587, gain: 0.06, delay: 0 }, // D
    { freq: 740, gain: 0.05, delay: 0.06 }, // F#
    { freq: 880, gain: 0.04, delay: 0.12 } // A
  ];

  tones.forEach(({ freq, gain: g, delay }) => {
    const t = now() + delay;
    const osc = createOsc('sine', freq);
    const gain = createGain(g);

    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);

    osc.connect(gain).connect(audioCtx.destination);
    osc.start(t);
    osc.stop(t + 0.2);
  });
};

// REMOTE LEAVE — layered descending tones
const sfxRemoteUserLeftVoiceChannel = () => {
  const tones = [
    { freq: 659, gain: 0.06, delay: 0 }, // E
    { freq: 523, gain: 0.05, delay: 0.06 }, // C
    { freq: 440, gain: 0.04, delay: 0.12 } // A
  ];

  tones.forEach(({ freq, gain: g, delay }) => {
    const t = now() + delay;
    const osc = createOsc('sine', freq);
    const gain = createGain(g);

    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);

    osc.connect(gain).connect(audioCtx.destination);
    osc.start(t);
    osc.stop(t + 0.2);
  });
};

export const playSound = (type: SoundType) => {
  switch (type) {
    case SoundType.MESSAGE_RECEIVED:
      return sfxMessageReceived();
    case SoundType.MESSAGE_SENT:
      return sfxMessageSent();

    case SoundType.OWN_USER_JOINED_VOICE_CHANNEL:
      return sfxOwnUserJoinedVoiceChannel();
    case SoundType.OWN_USER_LEFT_VOICE_CHANNEL:
      return sfxOwnUserLeftVoiceChannel();

    case SoundType.OWN_USER_MUTED_MIC:
      return sfxOwnUserMutedMic();
    case SoundType.OWN_USER_UNMUTED_MIC:
      return sfxOwnUserUnmutedMic();

    case SoundType.OWN_USER_MUTED_SOUND:
      return sfxOwnUserMutedSound();
    case SoundType.OWN_USER_UNMUTED_SOUND:
      return sfxOwnUserUnmutedSound();

    case SoundType.OWN_USER_STARTED_WEBCAM:
      return sfxOwnUserStartedWebcam();
    case SoundType.OWN_USER_STOPPED_WEBCAM:
      return sfxOwnUserStoppedWebcam();

    case SoundType.OWN_USER_STARTED_SCREENSHARE:
      return sfxOwnUserStartedScreenshare();
    case SoundType.OWN_USER_STOPPED_SCREENSHARE:
      return sfxOwnUserStoppedScreenshare();

    case SoundType.REMOTE_USER_JOINED_VOICE_CHANNEL:
      return sfxRemoteUserJoinedVoiceChannel();
    case SoundType.REMOTE_USER_LEFT_VOICE_CHANNEL:
      return sfxRemoteUserLeftVoiceChannel();

    default:
      return;
  }
};
