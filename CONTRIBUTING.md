# Contributing to Sharkord

Thank you for your interest in contributing to Sharkord! We're excited to have you here. This document provides guidelines and instructions for contributing to the project.

## i18n guidelines (client)

- Do not introduce new user-facing hardcoded strings in React components.
- Add/extend translation keys in language files:
	- [apps/client/src/i18n/locales/en.ts](apps/client/src/i18n/locales/en.ts)
	- [apps/client/src/i18n/locales/it.ts](apps/client/src/i18n/locales/it.ts)
	- Keep [apps/client/src/i18n/resources.ts](apps/client/src/i18n/resources.ts) as the locale aggregator only.
- Use semantic namespaces/keys (feature-oriented, not file-oriented).
- Reuse existing keys where possible; avoid near-duplicate wording.
- For server/trpc errors, prefer `getTrpcError` / `parseTrpcErrors` with `errors.*` keys and keep fallback to original message.
- For icon-only actions, provide translated `title`/label text for accessibility.

## Translation updates

When adding new keys:

1. Add key/value in `en` and `it`.
2. Wire key usage in components/hooks.
3. Run typecheck/lint and verify no regressions in affected flows.

## Adding a new language

1. Copy [apps/client/src/i18n/locales/en.ts](apps/client/src/i18n/locales/en.ts) to a new language file (example: `es.ts`).
2. Translate all values without changing key names.
3. Register the locale in [apps/client/src/i18n/resources.ts](apps/client/src/i18n/resources.ts).
4. Add the code to `APP_LANGUAGES` in [apps/client/src/helpers/language.ts](apps/client/src/helpers/language.ts).
5. Validate from workspace root:

```bash
bun run check-types
bun run lint
```
