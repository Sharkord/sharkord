const applyEnvOverrides = <T>(
  config: T,
  overridesMap: Record<string, string>
): T => {
  const updatedConfig = structuredClone(config);

  for (const [configKey, envVar] of Object.entries(overridesMap)) {
    if (process.env[envVar]) {
      const keys = configKey.split('.');

      let current: Record<string, unknown> = updatedConfig as Record<
        string,
        unknown
      >;

      let isReachable = true;

      for (let i = 0; i < keys.length - 1; i++) {
        const key = keys[i];
        const next = key === undefined ? undefined : current[key];

        // a typo in the override map would otherwise throw on the next lookup
        if (!next || typeof next !== 'object') {
          isReachable = false;
          break;
        }

        current = next as Record<string, unknown>;
      }

      const finalKey = keys[keys.length - 1];
      const envValue = process.env[envVar];

      if (!isReachable || finalKey === undefined) {
        continue;
      }

      try {
        current[finalKey] = JSON.parse(envValue!);
      } catch {
        current[finalKey] = envValue;
      }
    }
  }

  return updatedConfig;
};

export { applyEnvOverrides };
