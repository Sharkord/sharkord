const SCHEME_REGEX = /^[a-z][a-z0-9+.-]*:\/\//i;
const LOCAL_HOST_REGEX = /^(localhost|127\.0\.0\.1|\[::1\])(:|\/|$)/i;

const normalizeServerUrl = (input: string): string | null => {
  const trimmed = input.trim();

  if (!trimmed) {
    return null;
  }

  let withScheme = trimmed;

  if (!SCHEME_REGEX.test(trimmed)) {
    // local dev servers have no tls, everything else is assumed to be https
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
