type THotkeysValues = {
  enabled: boolean;
  token: string;
  bindings: Record<string, string>;
};

type THotkeysOnChange = <K extends keyof THotkeysValues>(
  key: K,
  value: THotkeysValues[K]
) => void;

export type { THotkeysOnChange, THotkeysValues };
