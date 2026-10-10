const WILDCARD_HOSTS = ['', '0.0.0.0', '::'];

// the address users should open, a wildcard bind is not something a browser can reach
const getHost = (configuredHost: string, fallbackHost: string) => {
  if (WILDCARD_HOSTS.includes(configuredHost)) {
    return fallbackHost;
  }

  // ipv6 literals need brackets to be used in a url
  if (configuredHost.includes(':')) {
    return `[${configuredHost}]`;
  }

  return configuredHost;
};

export { getHost };
