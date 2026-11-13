let pictureInPictureVideo: HTMLVideoElement | undefined;

export const getPictureInPictureVideo = () => {
  if (pictureInPictureVideo) {
    return pictureInPictureVideo;
  }

  const video = document.createElement('video');

  video.muted = true;
  video.playsInline = true;

  video.style.cssText =
    'position:fixed;width:1px;height:1px;opacity:0;pointer-events:none';

  document.body.appendChild(video);

  pictureInPictureVideo = video;

  return video;
};

export const releaseStalePictureInPicture = (
  streams: (MediaStream | undefined)[]
) => {
  const video = pictureInPictureVideo;

  if (!video || !video.srcObject) return;

  if (streams.includes(video.srcObject as MediaStream)) return;

  if (document.pictureInPictureElement === video) {
    document.exitPictureInPicture().catch(() => undefined);
  }

  video.srcObject = null;
};
