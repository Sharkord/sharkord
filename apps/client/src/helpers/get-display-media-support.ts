const getSupportedConstraints = () => {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices) {
    return null;
  }

  if (typeof navigator.mediaDevices.getSupportedConstraints !== 'function') {
    return null;
  }

  try {
    return navigator.mediaDevices.getSupportedConstraints();
  } catch {
    return null;
  }
};

const getRestrictOwnAudioSupport = () => {
  const constraints = getSupportedConstraints();

  // @ts-expect-error - this is experimental and not in the types yet
  return !!constraints?.restrictOwnAudio;
};

const getSuppressLocalAudioPlaybackSupport = () => {
  const constraints = getSupportedConstraints();

  // @ts-expect-error - this is experimental and not in the types yet
  return !!constraints?.suppressLocalAudioPlayback;
};

export { getRestrictOwnAudioSupport, getSuppressLocalAudioPlaybackSupport };
