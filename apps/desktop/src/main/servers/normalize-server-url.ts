const SCHEME_REGEX = /^[a-z][a-z0-9+.-]*:\/\//i;
const LOCAL_HOST_REGEX =
  /^(localhost|\[::1\]|127(\.\d{1,3}){3}|10(\.\d{1,3}){3}|192\.168(\.\d{1,3}){2}|172\.(1[6-9]|2\d|3[01])(\.\d{1,3}){2}|169\.254(\.\d{1,3}){2}|[a-z0-9-]+\.local)(:|\/|$)/i;

const normalizeServerUrl = (input: string): string | null => {
  const trimmed = input.trim();

  if (!trimmed) {
    return null;
  }

  let withScheme = trimmed;

  if (!SCHEME_REGEX.test(trimmed)) {
    // local and lan servers default to http, everything else is assumed to be https
    withScheme = LOCAL_HOST_REGEX.test(trimmed)
      ? `http://${trimmed}`
      : `https://${trimmed}`;
  }

  try {
    const url = new URL(withScheme);

    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return null;
    }

    return url.origin;
  } catch {
    return null;
  }
};

export { normalizeServerUrl };
