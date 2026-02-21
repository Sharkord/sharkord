{
  "$schema": "https://unpkg.com/knip@5/schema.json",
  "workspaces": {
    ".": {
      "entry": [],
      "project": []
    },
    "apps/server": {
      "entry": ["src/**/__tests__/**/*.test.ts", "build/**/*.ts"],
      "project": ["src/**/*.ts"],
      "ignore": ["src/db/migrations/**", "data/**", "data-test/**"]
    },
    "apps/client": {
      "entry": ["src/main.tsx"],
      "project": ["src/**/*.{ts,tsx}"],
      "ignore": ["dist/**", "public/**"]
    },
    "packages/shared": {
      "entry": ["src/**/*.ts"],
      "project": ["src/**/*.ts"]
    },
    "packages/ui": {
      "entry": ["src/**/*.ts", "src/**/*.tsx"],
      "project": ["src/**/*.ts", "src/**/*.tsx"]
    }
  },
  "ignore": ["**/*.d.ts", "**/dist/**", "**/build/**", "**/node_modules/**"],
  "ignoreDependencies": [],
  "ignoreExportsUsedInFile": true
}
