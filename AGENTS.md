# AGENTS.md

Guide for AI agents working on Sharkord. Read [CONTRIBUTING.md](CONTRIBUTING.md) for
project scope and PR rules — this file covers how the code is organized.

Core principle from CONTRIBUTING: **no over-engineering**. Follow the existing pattern,
add the smallest thing that works, don't introduce unneeded abstractions or dependencies for a
single use case, only if absolutely necessary. If you find yourself writing a lot of new code, check if it can be
done with existing helpers or patterns first.

## Architecture

Bun workspaces monorepo. `bun install` at the root, `./start.sh` (tmux) or `bun dev` in
each app to run.

| Workspace             | What it is                                                                     |
| --------------------- | ------------------------------------------------------------------------------ |
| `apps/server`         | Bun + tRPC + Drizzle (SQLite) + mediasoup (voice SFU)                          |
| `apps/client`         | React + Vite + Redux Toolkit + Tailwind                                        |
| `packages/shared`     | Types, enums, helpers shared by client and server. Cross-cutting types go here |
| `packages/ui`         | Presentational components only, no app logic                                   |
| `packages/plugin-sdk` | Public API surface for plugins                                                 |
| `packages/e2e`        | Playwright end-to-end tests                                                    |

Client ↔ server talk over **tRPC**: queries/mutations plus WebSocket subscriptions for
realtime events. Everything that can't be tRPC (login, uploads, static/public files,
healthz, plugin bundles) lives in `apps/server/src/http`.

Server boot order is explicit in `apps/server/src/index.ts` (dirs → db → plugins →
servers → mediasoup → voice runtimes → crons). The top imports there are order-sensitive;
don't reorder them.

Runtime state (voice rooms, mediasoup transports) lives in `src/runtimes`. Anything
persistent goes through the database.

## Backend code style & file structure

`apps/server/src`:

- `routers/<domain>/` — one tRPC procedure **per file**, named after what it does
  (`send-message.ts`, `ban.ts`). The file exports a single `<name>Route`; the domain's
  `index.ts` does nothing but import those and compose the `t.router({ ... })` map.
  Subscriptions all live in the domain's `events.ts`. New endpoint = new file, never
  append to an existing procedure file.
- `db/queries/` reads, `db/mutations/` writes, one file per table/domain. Anything reused
  by more than one route belongs here instead of being inlined.
- `db/publishers.ts` — publishes realtime events consumed by subscriptions.
- `helpers/` — domain-aware helpers (permissions, paths, file crypto, sanitizing).
  `utils/` — infrastructure with no domain knowledge (trpc setup, pubsub, env, rate
  limiters). If unsure, it's a helper.
- `queues/` — background work off the request path. `crons/` — scheduled jobs.
- `plugins/` — plugin loading, registries, event bus. Plugins run in the server
  process by design, there is no sandbox and isolation is deliberately not attempted.

Conventions:

- **Named exports only.** Server files declare `const foo = ...` and export at the bottom
  (`export { foo };`); client/shared files use inline `export const`. Match the file
  you're in.
- **kebab-case filenames**, one clear responsibility per file. Files are small on purpose.
- Types are `T`-prefixed (`TJoinedMessage`), declared next to their use or in
  `packages/shared` when both sides need them. Avoid `any`.
- Every procedure validates input with `zod` and starts with permission checks
  (`ctx.needsPermission` / `ctx.needsChannelPermission`).
- Use `invariant(condition, { code, message })` from `utils/invariant` instead of throwing
  `TRPCError` by hand. Messages are user-facing — write them that way.
- Use `protectedProcedure`; wrap in `rateLimitedProcedure` for anything a user can spam,
  with limits from `config.rateLimiters`.
- Imports are auto-organized by prettier — don't hand-sort.
- **ALWAYS** use modern ES6+ syntax: `const`/`let`, arrow functions, destructuring, template literals, etc.

Run `bun run magic` (lint:fix + format + check-types) before finishing; CI enforces it.

### Don't repeat, and put code where it belongs

Before you write anything, search for it. Most of what a new route needs already exists.

- **Search first.** Grep `helpers/`, `utils/`, `db/queries/`, `db/mutations/` and
  `packages/shared` for the behaviour you are about to write. Reuse it, or extend it.
- **Two copies is the limit.** Writing the same logic a third time means it becomes a
  helper. Writing it a second time is acceptable if the two cases are genuinely unrelated.
- **Never copy-paste a route or a query and edit it.** The copy drifts from the original
  and one of the two ends up wrong. Extract what they share instead.
- **Place code by layer, not by convenience:** db access in `db/queries` / `db/mutations`,
  domain rules in `helpers/`, infrastructure in `utils/`, orchestration only in the route.
  A route that contains a raw multi-table query, or a `utils/` file that knows about
  permissions, is in the wrong place.
- **A domain operation in `helpers/` owns its own write.** `banUser`, `createChannel` and
  `setMessagePinned` each do one write next to the event, the publish and the activity log
  that belong with it, because a route and a plugin action both have to go through exactly
  that sequence. Splitting the statement into `db/mutations/` for one caller buys an
  indirection and loses the guarantee that the side effects travel with it. A write that is
  genuinely just a write, reused by several operations, still belongs in `db/mutations/`.
- **Shared means shared.** Anything both client and server rely on — constants, enums,
  types, regexes, validation rules — lives in `packages/shared`, declared once. Anything
  only one side uses does not belong there.
- One responsibility per file. If you have to use "and" to describe a file, split it.

Don't invert this into over-abstraction: no helper for a single call site, and no merging
of two blocks that only look similar. A little duplication beats the wrong abstraction.

### Security check order (every route, no exceptions)

Checks go in this order, cheapest and broadest first. Never mutate anything before all of
them have passed.

1. **Authentication** — build the route on `protectedProcedure`. Only use
   `publicProcedure` when the endpoint is genuinely pre-auth, and say why in a comment.
2. **Rate limiting** — wrap in `rateLimitedProcedure` with limits from
   `config.rateLimiters` for anything a user can spam or use to probe (writes, uploads,
   searches, anything touching auth or invites).
3. **Input validation** — `.input(z.object({ ... }))`. Validate shape _and_ bounds
   (lengths, ranges, enums) here, not later in the handler.
4. **Global permission** — `ctx.needsPermission(Permission.X)` for the action itself.
5. **Existence** — load the target row and `invariant(row, { code: 'NOT_FOUND' })` before
   using any of its fields.
6. **Scope / channel access** — `assertChannelAccess(ctx, channelId)` (view permission +
   DM membership), then `ctx.needsChannelPermission(channelId, ChannelPermission.X)` for
   the specific action. Every id that arrives from the client must be proven to belong to
   a channel the caller can actually see — never trust a `channelId` in the input over the
   one stored on the row.
7. **Ownership / elevation** — owner-or-privileged checks last, e.g.
   `invariant(row.userId === ctx.user.id || (await ctx.hasPermission(Permission.MANAGE_X)), …)`.
   Role changes additionally go through `assertCanModifyOwnerRole`.
8. **Server settings gates** — feature toggles and quotas (uploads enabled, DM file
   sharing, max files per message) before acting on them.
9. **Sanitize** — `sanitizeMessageHtml` any user HTML, and re-validate after sanitizing
   (content that was non-empty can become empty).

Independent checks can run in one `Promise.all`, but only within the same step — don't
collapse steps to save a round trip. Error messages are user-facing and must not leak
whether a resource exists to someone who can't see it: prefer `NOT_FOUND` over `FORBIDDEN`
when the caller has no visibility of the resource at all.

## Migrations

Drizzle Kit, SQLite. Migrations live in `apps/server/src/db/migrations` and are applied
automatically at startup and before every test — there is no manual migrate step.

Normal flow:

1. Edit `apps/server/src/db/schema.ts`.
2. From `apps/server`, generate the SQL:

```bash
bun run db:gen
```

3. Review the generated `NNNN_*.sql`, commit it **and** the updated `meta/` snapshot plus
   `_journal.json`.

Data migrations (backfills, normalization) are hand-written SQL added the same way —
separate statements split with `--> statement-breakpoint`, filename renamed to describe the
intent (see `0006_lowercase_remaining_identities.sql`).

The separator must be written exactly as `--> statement-breakpoint`, **with the space**.
Drizzle splits migration files on that literal string and hands each piece to
`prepare()`, which compiles only the first statement of whatever it is given. Get the
separator wrong and every statement after the first is silently skipped — no error, the
migration is still recorded as applied.

Rules: never edit a migration that's already been committed — add a new one. Never
hand-edit `meta/` or `_journal.json`. `bun run db:check` verifies consistency. Local dev
data lives in `apps/server/data`; delete that folder for a clean reset.

## Database queries

SQLite is embedded and fast, but it runs in the same process as the server — a slow query
blocks everything. Optimize for **round trips and row counts**, not for clever SQL.

- **Never query inside a loop.** Batch with `inArray(table.id, ids)` and group the result
  into a `Map`/`Record` keyed by id. `joinMessagesWithRelations` in
  `db/queries/messages.ts` is the reference for loading relations (files, reactions, reply
  previews) for a page of rows.
- **Run independent queries in one `Promise.all`.** Only queries that depend on a previous
  result get their own await.
- **Select the columns you use** — `select({ id: t.id, name: t.name })`, not `select()` —
  whenever the row is large or holds blobs/HTML content.
- **One row: `.limit(1).get()`.** Never fetch a list and take `[0]` in JavaScript.
- **Aggregate in SQL.** `count()` with `groupBy` for counters, not
  `rows.length` over fetched rows. The same applies to filtering and sorting: `where` and
  `orderBy` beat `.filter()` and `.sort()` on a full table read.
- **Always paginate** anything unbounded. Use cursor pagination on `createdAt`
  (`lt(createdAt, cursor)` + `limit + 1` to detect the next page), as in `get-messages.ts`.
  Never `OFFSET` deep into a table.
- **Every `where`/`orderBy` column needs an index** in `schema.ts`. Filter + sort on the
  same query means a **composite** index in that order (`logins_user_created_idx`,
  `channels_category_position_idx`). Adding an index is a schema change → new migration.
- **Group multi-statement writes in `db.transaction()`** — it is one fsync instead of many
  and keeps the data consistent on failure. Reorder/permission/delete routes already do it.
- **The transaction callback must be synchronous.** Write
  `db.transaction((tx) => { ... })`, never `db.transaction(async (tx) => { ... })`, and end
  every statement inside with the driver's sync execution (`.run()`, `.get()`, `.all()`)
  instead of `await`. drizzle's bun-sqlite driver runs the callback inside bun's native
  `Database.transaction()`, which commits the moment the callback returns: an async
  callback returns a pending promise, so the commit happens before any awaited statement
  has run and **nothing rolls back**. Anything genuinely async (password hashing, a
  settings read) has to happen before the transaction opens. `__tests__/transactions.test.ts`
  guards this.
- **Let the database cascade.** Foreign keys declare `onDelete: 'cascade'` and
  `PRAGMA foreign_keys = ON` is set, so don't hand-delete child rows.
- Don't add a cache. If a query is measurably slow, fix the index or the query shape
  first; a cache is a last resort and needs invalidation nobody wants to maintain.

## Testing

Unit/integration tests are `bun:test`, colocated in `__tests__/` next to the code they
cover (`routers/__tests__/messages.test.ts`, `utils/__tests__/…`).

Run from the repo root:

```bash
bun run test
```

Plain `bun test` at the root will fail.

How server tests work:

- `src/__tests__/mock-db.ts`, `prepare.ts` and `setup.ts` are preloaded. Each test gets a
  **fresh in-memory SQLite db**, migrated and seeded — tests are isolated, no cleanup
  needed between them.
- Call routes through a real tRPC caller: `const { caller } = await initTest(userId)` from
  `src/__tests__/helpers.ts` (defaults to user 1, an admin; user 2 is the low-permission
  user used for permission checks). HTTP routes are tested against a real server on
  `testsBaseUrl`.
- Seed data is in `src/__tests__/seed.ts` — extend it rather than creating ad-hoc fixtures.
  A `createX()` helper at the top of a test file that inserts a row is an ad-hoc fixture:
  put the row in `seed.ts` instead, document it in the summary comment at the top of that
  file, and reference it from the test by its seeded id. Append new rows **after** the
  existing ones so the ids already asserted on elsewhere do not shift, and check
  `setup.test.ts` (it asserts the seeded row counts) when you add one.

### Route test coverage (mandatory)

Every route must have tests covering **all of its cases**, added in the same PR as the
route. For each route that means, at minimum:

1. The happy path, asserting the persisted result — not just that it didn't throw.
2. One test per rejection the route can produce: missing global permission, missing channel
   permission, non-member of a DM, not found, not the owner (and the owner-override path
   where one exists), each validation failure, and each server-settings gate.
3. Side effects the route promises: published realtime events, queued jobs, emitted plugin
   events, cascading deletes.

Use user 1 (admin) for the happy path and user 2 (low permissions) for the rejection
cases. Assert on the actual error message, as the existing router tests do.

The only acceptable reason to skip a case is that the architecture makes it unreachable in
the test harness (mediasoup/voice transports, real WebSocket transport, external network,
filesystem-level failures). When that happens, cover everything around it and leave a short
comment in the test file naming what isn't covered and why. "Hard to set up" is not a
reason — extend `seed.ts` or `helpers.ts` instead.

## Client conventions

`apps/client/src`:

- `features/` — Redux Toolkit state, read through hooks/selectors, never by reaching into the
  store shape. Top level slices (`app`, `dialogs`, `server-screens`, `server`) own a `slice.ts`;
  the `server/*` domains have **none**, their reducers all live in `features/server/slice.ts`
  and the domain folder holds `actions.ts`, `selectors.ts`, `hooks.ts` and `subscriptions.ts`.
  A service that owns no state belongs in `helpers/` or `lib/`, not here.
- `components/` — app components, one folder per component with `index.tsx` plus its local
  parts, `helpers.ts` and `hooks/`. Keep component-local logic in that folder.
- `screens/` — top-level routes. `hooks/` — generic reusable hooks (`use-*.ts`).
  `lib/trpc.ts` — the tRPC client; server calls go through `getTRPCClient()`.
- Generic, styleable, logic-free components belong in `packages/ui`, not here.
- Same naming rules as the backend: kebab-case files, named exports, `T`-prefixed types,
  no `any`. Import with the `@/` alias.
- User-facing strings go through i18n (`src/i18n`), never hardcoded. That includes toast
  messages in `catch` blocks: `toast.error(getTrpcError(error, t('failedX')))`.
  In a component or a hook, always use `const { t } = useTranslation('ns')`, and add `t` to
  the dependency array of any `useCallback`/`useEffect` that uses it. The imperative
  `import { i18n } from '@/i18n'` is only for code that is neither, a plain module such as
  `features/**/actions.ts` or a `helpers/` function, where there is no hook to call.
- Agressive memo everywhere: `React.memo`, `useMemo`, `useCallback`. Never define an event
  handler inline in JSX (`onDrop={(e) => ...}`, `onClick={() => setX(false)}`) — a new
  function identity on every render defeats the `React.memo` on the child receiving it.
  Extract it to a named `useCallback` above the return.
- Components should be small and focused. Split when a file has become hard to follow or has
  grown a second responsibility, **never because it crossed a line count**.

Server calls go inline where they are used, wrapped in `try`/`catch` with a toast, the way
`handleDragEnd` in `left-sidebar/channels.tsx` does it. Do not add a function to
`actions.ts` that only wraps a single `getTRPCClient()` mutation — that indirection buys
nothing and hides the call site. `actions.ts` is for dispatching to the store and for logic
that several components share.

**Always name the client, never chain off the call.** `getTRPCClient()` is assigned to a
`const trpc` first, and the procedure is called on that:

```ts
// no
await getTRPCClient().messages.toggleReaction.mutate({ messageId, emoji });

// yes
const trpc = getTRPCClient();

try {
  await trpc.messages.toggleReaction.mutate({
    messageId,
    emoji: emoji.shortcodes[0]
  });
} catch (error) {
  // code
}
```

The chained form buries the call site, gets worse the moment a second call is added, and
hides that `getTRPCClient()` itself can throw. Where that throw matters — it has no client
during a reconnect — put the `const trpc` **inside** the `try` so the failure lands in the
same `catch` as the call.

Derived state is a selector, never an inline comparison inside an action or component.
Before writing one, **search `selectors.ts` for it** — comparisons like "is the selected
channel the one we are connected to" usually already exist
(`isCurrentVoiceChannelSelectedSelector`). Reuse it instead of re-deriving it from two
other selectors at the call site.

Name a hook after the thing it owns, not the event it reacts to:
`useVoiceMoveSubscription`, not `useReceiveVoiceMove`.

### Selectors and caching

Every selector runs on every dispatch, for every subscribed component. A selector that
builds a new array or object **without memoizing** hands `useSelector` a new reference every
time and re-renders its component on **unrelated** state changes. Pick the right tool:

- **Plain function** for a direct state read: `(state: IRootState) => state.server.x`.
  Nothing is derived, so there is nothing to memoize. `selectedChannelIdSelector`.
- **`createSelector`** (`@reduxjs/toolkit`) the moment you `filter`, `map`, `sort`,
  `reduce`, or build an object/array. `directMessagesUnreadCountSelector`.
- **`createCachedSelector`** (`re-reselect`) for a selector that takes a parameter, keyed
  by that parameter: `createCachedSelector([inputs, (_, id) => id], fn)((_, id) => id)`.
  `channelByIdSelector`, `userByIdSelector`.

Installed `reselect` 5 memoizes per combination of inputs, not in a single slot, so
parameterized selectors do not evict each other. Rules:

- **Prefer `createCachedSelector` for parameterized selectors**, for explicit keying and an
  obvious cache boundary. This is a **consistency** rule, not a performance one: do not
  rewrite a working plain `createSelector` on performance grounds.
- **Return a stable empty value.** A `?? {}` or `?? []` fallback in a **plain** selector
  allocates on every call and re-renders the component on every dispatch, since there is no
  memoization to save you. Use the module-level `DEFAULT_OBJECT` / `DEFAULT_ARRAY` the domain
  already declares.
- **Compose selectors, don't re-derive.** Pass existing selectors as inputs rather than
  reaching into `state` again inside the result function, so the memoization has something to
  compare.
- **A selector that must stay uncached** (because it reads several slices imperatively)
  belongs in actions only, and says so in a comment above it, the way
  `isChannelTextVisibleByIdSelector` does.
- **Cross-domain selectors live in `features/server/selectors.ts`**, not in a domain's
  `selectors.ts`. A domain file importing from `features/server/selectors.ts` is a circular
  import, since that file already imports the domains. If your selector needs channels
  *and* permissions *and* the own user, it goes in the shared file, with its hook in
  `features/server/hooks.ts` (`referenceableChannelsSelector`,
  `visibleChannelsInCategorySelector`).
- Domain rules used by more than one selector go in `features/server/helpers.ts`
  (`canViewChannel`), never re-implemented inline. Re-implementing one is how the owner
  branch gets dropped.
- **Name selector results before comparing them.** When reading the store imperatively, assign
  each call to a `const` and compare the names, never the calls:

  ```ts
  // no
  if (selectedChannelIdSelector(state) === currentVoiceChannelIdSelector(state)) {

  // yes
  const selectedChannelId = selectedChannelIdSelector(state);
  const currentVoiceChannelId = currentVoiceChannelIdSelector(state);

  if (selectedChannelId === currentVoiceChannelId) {
  ```

  The names are what say which two things are being compared, the call sites do not. It also
  keeps the reads together at the top of the function, where a stale `state` is obvious. A
  single boolean guard whose selector already reads as the condition is fine as it stands
  (`if (isCurrentVoiceChannelSelectedSelector(state)) return;`).

`bun run magic` applies here too.

## After the feature/fix is done

### Translations

If you add new user-facing strings, you need to make sure you add them to ALL supported languages. To do this, navigate to the scripts package and run the following command:

```bash
bun run synci18n
```

This command will output a list of missing translations, including the language, key and file. You will need to add the missing translations to the appropriate files in `apps/client/src/i18n/locales/`. Make sure the translations are accurate and contextually appropriate for the application. Only fix translations that have been touched by your changes.

### Tests

Every new behaviour needs tests and the whole suite must pass, see [Testing](#testing).

## Style

- Never use dashes (—) in code, comments, UI strings or commit messages.
- Always start comments with lowercase.
- Comment edge cases, non-obvious context and **why**. Never restate what the code says.
- NEVER comment in the middle of a react component's JSX, or inside a type definition.
- NEVER nest ternaries. One `a ? b : c` is fine; a ternary inside another one's branches is
  not, in code or in JSX. Use an early return, a lookup object, or an `if`/`else` assigned to a
  `let`. If the branches are what a component renders, split it into two components or pull the
  choice into a variable above the return.
- NEVER prefix a call with `void`. Write `returnToPresent();`, not `void returnToPresent();`.
  It reads as a type, adds nothing at runtime, and marks the one thing worth looking at (a
  promise nobody awaits) as deliberate instead of leaving it visible. If the promise genuinely
  cannot be awaited, either handle its failure with a `.catch()` or say why in a comment.
- Do NOT comment on everything. Comments are for context and explain possible edge cases, not for restating what the code does.