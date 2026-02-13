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

      for (let i = 0; i < keys.length - 1; i++) {
        const key = keys[i];

        if (key === undefined) continue;

        current = current[key] as Record<string, unknown>;
      }

      const finalKey = keys[keys.length - 1];
      const envValue = process.env[envVar];

      if (finalKey === undefined) {
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
