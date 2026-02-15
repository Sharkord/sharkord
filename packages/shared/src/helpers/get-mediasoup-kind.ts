import { StreamKind } from "../types";

// the StreamKind is used to differentiate between different types of streams in the interface
// but for mediasoup we need to map them to either "audio" or "video"
const getMediasoupKind = (kind: StreamKind): "audio" | "video" => {
  switch (kind) {
    case StreamKind.AUDIO:
    case StreamKind.EXTERNAL_AUDIO:
    case StreamKind.SCREEN_AUDIO:
      return "audio";
    case StreamKind.VIDEO:
    case StreamKind.SCREEN:
    case StreamKind.EXTERNAL_VIDEO:
      return "video";
  }
};

export { getMediasoupKind };
