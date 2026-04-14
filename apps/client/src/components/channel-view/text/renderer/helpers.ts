const twitterRegex = /https:\/\/(twitter|x).com\/\w+\/status\/(\d+)/g;

const getYoutubeVideoId = (url: URL) => {
  const hostname = url.hostname.replace(/^www\./, '');

  if (hostname === 'youtu.be') {
    return url.pathname.split('/').filter(Boolean)[0] ?? undefined;
  }

  if (!hostname.endsWith('youtube.com')) {
    return undefined;
  }

  const [firstSegment, secondSegment] = url.pathname.split('/').filter(Boolean);

  if (url.pathname === '/watch') {
    return url.searchParams.get('v') ?? undefined;
  }

  if (firstSegment && ['shorts', 'embed', 'v', 'live'].includes(firstSegment)) {
    return secondSegment ?? undefined;
  }

  return undefined;
};

const getTweetInfo = (
  href: string
): {
  isTweet: boolean;
  tweetId: string | undefined;
} => {
  try {
    const url = new URL(href);
    const isTweet =
      url.hostname.match(/(twitter|x).com/) && href.match(twitterRegex);

    const tweetId = isTweet
      ? href.match(twitterRegex)?.[0].split('/').pop()
      : undefined;

    return { isTweet: !!isTweet, tweetId };
  } catch {
    // ignore
  }

  return { isTweet: false, tweetId: undefined };
};

const getYoutubeInfo = (
  href: string
): {
  isYoutube: boolean;
  videoId: string | undefined;
} => {
  try {
    const url = new URL(href);
    const videoId = getYoutubeVideoId(url);

    return { isYoutube: !!videoId, videoId };
  } catch {
    // ignore
  }

  return { isYoutube: false, videoId: undefined };
};

export { getTweetInfo, getYoutubeInfo, getYoutubeVideoId };
