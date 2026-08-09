# Sharkord codebase audit

Incremental audit of the whole codebase, one chunk at a time. Findings are added to the
section of the chunk they belong to. Fixes are applied later, also chunk by chunk.

Lens per chunk, in priority order: **security → correctness → performance → duplication &
code placement → over-engineering → [AGENTS.md](AGENTS.md) conformance**.

## Duplication & code placement (check in every chunk)

Run this check on every chunk, not only the ones that look messy:

- **Repeated logic.** The same validation, permission check, mapping, formatting or query
  shape written more than once. Two copies is a note, three is a finding. Record every
  location so the later fix can collapse them into one helper.
- **Reinvented helpers.** Code that redoes something that already exists in
  `helpers/`, `utils/`, `packages/shared`, or the standard library. Name the existing
  helper in the finding.
- **Near-duplicates.** Copies that drifted — same logic, different edge-case handling or
  error message. These matter more than exact copies: one of the copies is usually wrong.
- **Wrong home.** Code sitting in the wrong layer: db access inside a route instead of
  `db/queries`, domain logic in `utils/`, server-only or client-only code in
  `packages/shared`, app logic in `packages/ui`, business logic inside a component.
- **Wrong shape.** A file with several unrelated responsibilities, a folder whose files
  have no common theme, or a name that does not describe what is inside.
- **Duplication across the client/server boundary.** The same constant, type, regex or
  rule declared on both sides instead of once in `packages/shared` — these silently drift
  apart and cause bugs the type checker cannot see.

Do not propose an abstraction for a single use, and do not merge two things that only look
alike. Duplication is cheaper than the wrong abstraction.

## Tests

Take into account that tests MIGHT be wrong. If a test fails, it does not mean the code is wrong, it could be that the test itself is wrong. Before assuming that the code is wrong, check the test logic and ensure that it is testing the correct behavior. If a test is found to be incorrect, it should be fixed or removed.

You should also check for missing test cases, especially for edge cases and error handling.

## Severity

| Tag    | Meaning                                                                     |
| ------ | --------------------------------------------------------------------------- |
| `CRIT` | Exploitable now, or loses/corrupts data. Fix before anything else.          |
| `HIGH` | Real bug or security weakness that needs a specific condition to trigger.   |
| `MED`  | Wrong under load or edge cases, or a performance problem users will notice. |
| `LOW`  | Over-engineering, dead code, convention violations, missing tests.          |

Each finding: `file:line` — what is wrong — why it matters — suggested fix.

## Flagged for review

Things that came up while fixing and need a decision, a second pair of eyes, or simply
were not verifiable by me. Reviewed together at the end rather than interrupting the
chunk being worked on.

### F1 — an unrelated stash of yours was applied to the working tree, and resolved by me

While trying to prove that 2.12's new test fails against the old predicate, I ran
`git stash push <path>` from a directory where that relative path did not resolve, so
nothing was stashed, and then `git stash pop`, which applied **`stash@{0}`** (a
pre-existing stash of yours, `WIP on development` at `de7af05`) into the working tree. It
conflicted in `apps/server/src/db/schema.ts`.

State now:

- `stash@{0}` is **intact**: the pop aborted on the conflict, so it was never dropped. Its
  9-line `schema.ts` change is still stashed and unapplied.
- The conflict is resolved in favour of the committed schema, keeping
  `storageImageOptimizationEnabled.default(false)` and
  `storageImageOptimizationQuality.default(80)`, plus the two foreign keys from 2.6.
- Suite green afterwards (885 server, 147 shared), `magic` clean.

**What needs your eye:** that stash appears to *remove* those two defaults. I kept what is
committed and what the migrations expect, but I cannot know whether the stash was a
deliberate schema change you still want. If it was, it is waiting and unapplied.

I should not have reached for `git stash` at all; copying the file aside would have done
the same job without touching your stash list.

### F2 — 2.12's test was never verified against the old behaviour

The point of the aborted experiment above was to confirm the new same-millisecond
pagination test actually fails with the old strict `lt` predicate. It passes with the fix,
but I never saw it fail without it, so it is unproven as a regression test. Worth
re-running that check properly (copy the file aside, revert the predicate, run, restore).

### F3 — 3.14, kick is cosmetic, needs a product decision

`users/kick.ts` closes the WebSocket and nothing else. The token stays valid, so a client
reconnects immediately. Every other finding in chunk 3 had a clear right answer; this one
does not, so I left the route untouched.

Two coherent options, and they lead to different code:

- **It is a nudge.** Then the behaviour is correct and what needs fixing is the naming and
  the activity-log entry, which currently oversell it as a removal.
- **It is a removal.** Then it needs a short-lived rejoin block (a `kickedUntil` timestamp
  on the user, checked in `wss.ts` next to the ban check), which is a schema change and
  overlaps with the token-revocation work in 1.17 / 3.13 / 3.15.

Related: 1.17, 3.13 and 3.15 all end at the same missing piece, there is no way to
invalidate a token before its seven-day expiry. Whatever mechanism gets built there
(a token version column, a revocation list) is what 3.14's second option would reuse, so
these four are worth deciding together rather than one at a time.

### F4 — 3.16, the channel permission matrix storage shape

`channels.updatePermissions` writes one row per channel per target per permission on every
save, `allow: false` included, so the table grows as (channels x targets x permissions).
Storing only the overrides that differ would fix it, but that changes what an **absent**
row means, which the read path in `channelUserCan` and the client's permission editor both
depend on. I fixed the missing existence validation and left the shape alone: it needs a
migration, a matching read-path change, and a decision on the default semantics.

### F5 — two tests in `others.test.ts` only pass because of a queue race

`others.test.ts` passes in a full `bun run test` and **fails when the file is run alone**:

```bash
bun test ./src/routers/__tests__/others.test.ts
```

`should only ask for password on first join when setting is enabled` and `should require
password for first join and skip it afterwards when setting is enabled` both fail on
`expect(hasPassword).toBe(false)`. Verified against a clean checkout of both the test file
and the route, so this predates the audit; I hit it while adding an unrelated test.

Cause: `others/join.ts` calls `enqueueLogin`, which pushes the `logins` insert onto an
async queue rather than awaiting it. `shouldAskServerPassword` reads that row through
`hasUserJoinedBefore`. In a full run there are enough event loop turns for the insert to
land before the assertion; alone, there are not.

The second half is worse than the flake: `setup.ts` builds a fresh in-memory database
**per test**, while the queue outlives the test. A login enqueued in one test can be
written into the next test's database, so this leaks across tests in both directions.

Belongs to chunk 13 (test suite). The fix is either draining the queues in `afterEach` or
exposing a way to await them, not changing the two tests. Left untouched.

### F6 — the secret token is both the ownership credential and the JWT signing key

Found while fixing 4.5. `settings.secretToken` is used for two unrelated jobs:

- it is the credential a user presents to `others.useSecretToken` to claim the owner role,
  which means it is shown to the operator and travels wherever they put it;
- it is the server's signing secret. `getServerToken()` returns it, `http/login.ts:287`
  signs every JWT with it, and `helpers/files-crypto.ts` uses it as the HMAC key for
  signed file URLs.

Consequences, none of which I changed:

- **it cannot be made single use.** Clearing it on use, which is what 4.5 asked for, would
  invalidate every session and every signed file URL at once.
- **it cannot be rotated** without logging everyone out and breaking outstanding signed
  URLs, so there is no recovery if the operator leaks it.
- anyone who ever sees it can claim ownership repeatedly, forever.

The fix is to split the two: a separate `ownerClaimToken` column (single use, clearable,
rotatable) leaving `secretToken` as the signing key only. That is a schema change plus a
migration, and it needs a decision about existing servers, whose one value currently serves
both purposes.

Related to the token-revocation cluster in F3 (1.17 / 3.13 / 3.15): both are about not
being able to invalidate a credential once issued.

## To do at the end

Work that is not a finding in any one chunk, to be picked up once the chunks are done.

### T1 — rate limiters are drowning `config.ini`, decide on a config layout

`config.rateLimiters` now holds **18 entries**, each a `maxRequests` / `windowMs` pair, so
the generated `config.ini` is roughly 36 lines of limiter tuning around 9 lines of actual
server configuration (`server.*` and `webRtc.*`). Six of those entries were added during
this audit (`upload` in chunk 1, `updatePassword` and `adminCreate` in chunk 3,
`voiceTransport`, `voiceStream` and `useSecretToken` in chunk 4), so this is partly a
problem the audit created, and it will keep growing as more routes get limited.

The operator opens that file to change a port and has to scroll past the whole limiter
table. Worth deciding between:

- **split the file**: keep `config.ini` for `server` and `webRtc`, move the limiters to
  their own `limiters.ini`. Smallest change, and the limiter file can then be documented as
  "you probably do not need to touch this".
- **keep one file, move the limiters out of it**: ship the defaults in code only and let
  the ini override individual entries, so a default install has no limiter section at all.
- **change format**: an rc-style file, or TOML/JSON/YAML. ini is what forced the
  `preprocess` workarounds already present for `allowedOrigins` and `trustedProxies`, since
  ini cannot express a list and writes a one-element array as a bare string.

Whatever is chosen has to keep three things working, all in `config.ts`: the merge of the
existing file with the defaults on every boot (which is how new keys appear in old installs),
the rewrite of the file afterwards, and the `applyEnvOverrides` map, which currently covers
only `server.*` and `webRtc.*` and is keyed by dotted path.

Worth fixing at the same time: the loader's `catch` reports **any** schema failure as
"Error reading or parsing config.ini. Overwriting with default config." I hit this while
adding `pluginExecute` and having the schema entry land without the matching default. The
file was fine; the defaults were incomplete. The message sends you to the wrong file, and
the run dies anyway at the second `zConfig.parse` after the overrides. Validating
`defaultConfig` against the schema separately, before touching the file, would name the real
problem.

### T2 — the join payload is the ceiling on server size (4.7), and needs a design

`others/join.ts` returns every category, every visible channel, every public user, every
role, every emoji, every channel permission entry, every read state and all plugin metadata
in one message, on every connect and every reconnect. Nothing is paginated, nothing is
incremental.

Deferred deliberately rather than half fixed: bounding it is not a route change, it needs a
decision on how the client gets the rest (lazy fetch per domain, or an incremental sync with
a version cursor), and every one of those lists has a client-side consumer that assumes it
arrives complete. It also overlaps 3.8, where the same "unbounded but bounded by server
size" argument was used to leave `users.getAll`, `roles.getAll` and `invites.getAll` alone.

Worth measuring before designing: dump the payload for a realistic server and see which of
the ten lists actually dominates. It is likely users and messages-adjacent state, not the
ten equally.

### F7 — 6.3, how should a plugin authenticate the caller?

Flagged rather than fixed, out of scope for now.

Plugin HTTP routes are unauthenticated public endpoints by construction, not by oversight:
the SDK handler type is `(req: IncomingMessage, res: ServerResponse) => unknown`, with no
user, no session and no context, and `http/index.ts` dispatches to it before any
authentication runs. So `ctx.http.get('/data', handler)` publishes
`/plugins/<id>/data` to the internet and the SDK offers the author no way to require a
logged-in user. The insecure thing is not merely possible, it is the only thing available.

The open question is what the SDK should hand a plugin author:

- an authenticated variant, `ctx.http.authenticated.get(path, (req, res, user) => ...)`,
  resolving the token the way `getUserByToken` does and refusing the request otherwise;
- or a helper the handler calls itself, `const user = await ctx.http.getUser(req)`, leaving
  the route public and the decision to the plugin;
- or a per-route option, `ctx.http.get(path, handler, { requireAuth: true })`.

The first is the only one where the insecure path is not the default. All three need a
decision about what "authenticated" means for a plugin route (a session cookie, the
`x-token` header uploads already use, or a query token for URLs pasted into an `img` tag),
plus rate limiting for the plugin namespace, which today has none.

### T3 — [DONE] AGENTS.md's selector rule describes reselect 4

The "Selectors and caching" section states that `createSelector` has a cache of one and
names `userStatusSelector` and `userRolesSelector` as offenders to avoid copying. Both
claims are wrong for the installed `reselect` 5.1.1, where the default `weakMapMemoize`
caches per input combination (measured, see 8.1).

The advice to use `createCachedSelector` for parameterized selectors is still reasonable,
for explicitness and stable keying, but the stated reason is not. Worth rewriting so nobody
optimizes against a behaviour the library no longer has, and worth deciding whether
`createCachedSelector` should remain the house rule now that the default is adequate.

Rewritten. The section now states what reselect 5 actually does (`weakMapMemoize`, per
input combination), keeps `createCachedSelector` as the house rule for parameterized
selectors but labels it a **consistency** rule rather than a performance one, and says
outright not to rewrite a working plain `createSelector` on performance grounds. The
"never wrap a parameterized selector" rule and the two named offenders are gone, since the
claim behind them was false and both selectors have since been converted anyway. The
stable-empty-value rule was sharpened rather than dropped: it matters most in **plain**
selectors, which have no memoization to fall back on, and is an allocation rather than a
re-render inside a memoized result function. The opening paragraph now says "without
memoizing" instead of implying every derived selector re-renders on every dispatch.

### T4 — 9.4, decompose the voice provider

`components/voice-provider/index.tsx` is 1311 lines holding ~30 hooks, four
stream-acquisition routines, quality-layer bookkeeping, the refs map, the controls bridge
and the context assembly. AGENTS.md caps components at 200 lines.

Deferred deliberately during the audit: the three HIGH findings attributed to its size (9.1,
9.2, 9.3) are fixed without restructuring it, so what remains is maintainability, and this is
a multi-file refactor in a codebase with no tests.

Proposed decomposition, in the order worth doing:

1. `hooks/use-mic-stream.ts` — `startMicStream` is ~200 lines with 11 dependencies and is
   the single biggest piece (this is 9.15).
2. `hooks/use-webcam-stream.ts` and `hooks/use-screen-share-stream.ts` — the same shape.
3. the quality-layer bookkeeping and the refs map, which are independent of the streams.

The `hooks/` folder beside the file already holds `use-transports`, `use-voice-events`,
`use-transport-stats` and others, so the destination and the pattern both exist. Worth doing
after the client gets any test coverage at all, not before.

### F8 — 11.5, plugin UI runs in every user's browser without consent

Plugin client bundles are dynamically imported from the server and executed on the app's own
origin, with access to `localStorage` (including the session token), the DOM and anything
else the page can reach.

This is the client half of 6.1, which was dismissed as intended for the server. The
difference worth deciding on: on the server, the admin who installs a plugin is the one who
runs it. Here **every user's browser executes it**, and nothing tells them or asks them.

Options, none taken:

- a one-time consent prompt per plugin, per user, before its UI is loaded;
- a visible indicator of which plugins are contributing UI, so it is at least disclosed;
- documenting it as an accepted property of installing a plugin, matching how 6.1 was
  handled, on the grounds that a server admin is already trusted with the server.

The two mechanical problems alongside it (serial loading, console-only failures) are fixed.

### T5 — 11.6, four oversized files in screens and chrome

Same shape as T4, deferred for the same reason: a large refactor in a codebase with no tests.

- `server-screens/user-settings/devices/index.tsx`, **684 lines**, with
  `hooks/use-microphone-test.ts` at 612 beside it. The microphone, webcam and playback
  sections are independent and the folder already has a `hooks/`, so this is the one to
  split first.
- `server-screens/server-settings/storage/index.tsx`, 437 lines, splits along its control
  groups.
- `left-sidebar/channels.tsx`, 409 lines, already contains four memoized subcomponents that
  could be files.

AGENTS.md allows 400 for screens and 200 for components.

### T6 — 12.1, the three Firefox workarounds should now be redundant

`lib/trpc.ts` carries `isNavigatingAway` (set on `beforeunload`), `isCleaningUp`, and the
`setTimeout(…, 100)` that resets it, all added because `cleanup()` ran on every close and
Firefox fires `onClose` during a refresh. Now that `onClose` classifies and returns early for
both cases, the reasons for all three are gone.

They were kept anyway: they guard a refresh path with no automated coverage, and getting it
wrong means users silently lose auto-login. Removing them is a small, self-contained change
that wants a deliberate Firefox pass (M43 covers the current behaviour), not a drive-by.

### T7 — the disconnect close codes are outside RFC 6455

`DisconnectCode.KICKED = 40000`, `BANNED = 40001` and `SERVER_SHUTDOWN = 40002` are outside
the range RFC 6455 allows in a close frame (1000-1014, 3000-4999). npm `ws` refuses them in
`isValidStatusCode`; they only work because under Bun the app resolves `ws` to bun's builtin,
which does not validate. Measured end to end: a real browser accepts 40001 and reports it
with `wasClean = true`.

This became load-bearing with 12.1, which decides "end the session" vs "reconnect" from these
codes. Renumbering to 4000/4001/4002 is a one-line change in `packages/shared/src/statics`,
but it needs a decision about the upgrade window: a client on an older build would not
recognise the new codes and would treat a kick or ban as a dropped connection, retrying for
~30s before showing the disconnected screen. Not harmful, but it is a real transition cost,
and doing it at the same time as any other close-code change would be cheaper.

### T8 — 13.6, the e2e suite covers login and pagination and nothing else

17 tests across 4 files, of which one is an exploration harness. Real browser coverage is
authentication plus message pagination; nothing covers sending a message, voice, permissions,
server settings, plugins or DMs. Per chunk 8 this is also the *only* automated coverage the
client has at all, which makes it the cheapest place to buy confidence in the client changes
from chunks 8 to 12, none of which are verified by anything but `tsc`.

Deferred by decision during chunk 13: the mechanical half is fixed, but writing the specs is a
project, and new ones could not be run to green during the audit.

Proposed order, highest value first:

1. **sending a message** and seeing it render, since it is the core loop and reuses the
   existing `loginAs` fixture;
2. **permissions**, where a regression is silent and security relevant;
3. **DMs**, which have their own membership rules (5.4) that no browser test touches.

Voice needs real media devices and is the one place where "hard to set up" is a fair reason to
stop at manual testing.

### T9 — chunk 14, reorganize `packages/shared` (the whole chunk, deferred here by decision)

Chunk 14 is a restructuring step, not a review step, and it is deferred in full to the end of
the audit. Its own step 3 requires the target layout to be agreed before anything moves, so
nothing has been moved. The full inventory, the proposed layout and the eviction candidates
are in [chunk 14](#14-shared-package-reorganization); this entry records the order to do it in
and what is already done.

**Do it in two separate passes, not one.** They have different risk profiles and only the
first changes runtime behaviour.

**Pass 1, 14.1 on its own: sever the edge from `shared` to `apps/server`.**
`packages/shared/src/tables.ts:22` imports 20+ table objects from
`../../../apps/server/src/db/schema`. It is a *value* import under
`verbatimModuleSyntax: true`, so it is emitted rather than elided, and `schema.ts` calls
`sqliteTable(...)` at module scope, so the bundler keeps it. The client therefore ships
drizzle-orm's sqlite-core and the server's full table definitions: measured in a production
build as `drizzle:entityKind`, 17 drizzle occurrences and the literal identifiers
`channel_read_states`, `message_reactions` and `secret_token`. Identifiers, not data, so
nothing secret leaks, but the storage layout is public and every visitor pays for it on page
load.

Fix: declare the row types in `packages/shared` directly and have `apps/server` assert its
schema still matches them, on the server side where drizzle already lives. Worth a
before/after bundle size measurement, since shrinking the client bundle is half the point.

`trpc.ts:1` has the same inversion (`export type { AppRouter } from '../../../apps/server/…'`)
but is a type-only export, so it elides and costs nothing at runtime. Fix it for the
architecture, not for the bundle, and do not let it hold up pass 1.

**Pass 2, the folder restructure**, once the layout in chunk 14 is approved or amended.
Sequencing matters here and the original plan had it backwards, per 14.3: make `index.ts`
re-export **explicitly first**, *then* run knip, *then* delete. While the `export *` barrel is
in place knip reports zero unused exports in `packages/shared`, which is an artefact rather
than a clean result, so deleting on the strength of it would be deleting on the strength of
nothing.

Scale: `@sharkord/shared` is imported by 172 server files and 166 client files. Moves and
renames fail loudly as build errors rather than silently, so the file count overstates the
risk, but 14.1 is a real behaviour change and deserves its own verification.

Already closed by earlier chunks, so skip them when working through chunk 14:

- **14.2** (`export const A = 123;` as the first line of the public surface) was removed in 12.5.
- **14.5**'s `zPluginPackageJson`/`TPluginPackageJson` alias was removed in 12.3. The rest of
  14.5 stands: `UploadHeaders` still sits in `statics/permissions.ts:35`, which is what caused
  the misreading corrected in 1.1.
- **14.6** is the same gap as 12.9 and neither is fixed: `zPluginManifest` validates every
  plugin manifest at install and load time and has no tests. Worth doing independently of the
  restructure, since it needs no layout decision.

## Needs manual testing

Changes whose behaviour the automated suite cannot reach, either because the harness has no
mediasoup (voice runtimes, transports, producers) or because the change is in a UI path that
has no e2e coverage. Collected here to be clicked through in one pass at the end of the
audit rather than one at a time.

Format: what to do, then what should happen.

| # | Finding | What to test | Expected |
| --- | --- | --- | --- |
| M1 | 3.1 | As a non-owner admin holding `MANAGE_USERS`, try to ban, kick and delete the owner from the admin panel | Each is refused with "Only users with the owner role can act on the server owner." Banning a regular user still works |
| M2 | 3.3 | As a non-owner holding `MANAGE_ROLES`, edit a role and try to grant a permission you do not have; then rename a role that already holds one | The grant is refused, the rename succeeds |
| M3 | 3.4 | Create a category with a voice channel, join the voice channel from a second client, then delete the category | Both clients stop rendering the channel immediately, no reload needed, and the voice session ends. Server logs show no mediasoup router left behind |
| M4 | 3.5 | Set an avatar, then set `storageMaxAvatarSize` very low and try to change it | Error toast, and the previous avatar is still displayed after a reload |
| M5 | 3.9 | Drag channels within a category and categories in the sidebar, then reload | The order persists exactly as dropped, for every connected client |
| M6 | 3.10 | Create a voice channel | It appears and is joinable. (The runtime-failure rollback path cannot be triggered without exhausting mediasoup workers) |
| M7 | 3.21 | Open the channel permissions dialog in the admin panel | Permissions load as before, this route changed from a mutation to a query |
| M8 | 4.2 | Set a server join password, then open the **storage** settings page and save | The join password still applies to new joins. This is the bug that made the password vanish |
| M9 | 4.3 | With plugins enabled, save the storage settings page, then use a plugin command | Plugins keep working, no restart needed |
| M12 | 4.9 | As a moderator with `MOVE_MEMBERS`, move a user into a voice channel, including a private one | The move works, the target is pulled in and can see the channel. Try it from a moderator who cannot see the destination: refused |
| M13 | 4.14 | Delete a voice channel while two people are in a call in it | Both clients drop out of the call immediately and stop listing the participants, no reload needed |
| M14 | 4.11 | Install a plugin while offline, or with a bad checksum, then check the plugin list | The install fails with an error but the previously enabled plugin is still running, not dead until restart |
| M17 | 5.5 | Run the server normally and confirm `apps/server/data` grows a `db.sqlite-wal` file; send messages while scrolling history from a second client | Both work without stalling each other. WAL is the one change here with a visible on-disk difference |
| M18 | 5.11/5.3 | On a server with a lot of history, scroll a busy channel and watch unread badges update | Scrolling and badge updates stay responsive; this is the pair of changes meant to make that cheap |
| M39 | 11.2 | Change and remove an avatar, a banner and the server logo, including a failing case such as an oversized file | All six actions work, and a failure now shows the server's actual reason for all three, not just the avatar |
| M40 | 11.3 | Switch the app language, then trigger a few error toasts (join a voice channel with the server down, upload with uploads disabled) | The toasts appear in the selected language rather than English |
| M41 | 11.7 | Open the search dialog, the invite dialog and the moderation activity lists | Pagination, search and the date picker all behave as before, now that both components live in the ui package |
| M38 | 11.1 | In a browser that used a pre-February build, open devtools and check localStorage for `sharkord-user-password` | The connect screen's password field is empty, but the stored value is still present. That is expected: the read is gone, the value is not deleted |
| M35 | 10.3 | Scroll up in a busy channel, switch to another channel within a second, then switch back | Neither channel jumps to the bottom unexpectedly. This replaced four uncleaned timers with a ResizeObserver |
| M36 | 10.7 | React to messages, use the quick reaction row, pin and unpin voice cards, and fill in a plugin command's arguments | All still work. This touched 25 handlers, including extracting four new child components |
| M37 | 10.6 | Scroll far up in a long channel, then scroll back down | Messages re-render correctly in both directions, and previously seen messages stay cached rather than being re-parsed |
| M32 | 9.10 | Join a call and leave the stats popover closed, then open it | The popover fills in and updates while open. Counters resume rather than showing the whole call, which is expected now that polling only runs while something is watching |
| M33 | 9.6 | With noise suppression set to DTLN, then RNNoise, then off, join a call and speak | All three paths still load their worklet and process audio. This touched the loader every processor shares |
| M34 | 9.11 | Mute and unmute the mic, stop a screen share, then leave the call | Server side producers are cleaned up in every case. This swapped the event the cleanup mutation hangs off |
| M29 | 9.2 | Join a voice channel with noise suppression on and the noise gate **off**, then leave | The browser's microphone indicator goes out and the device is released. Repeat with the gate on, and with both off |
| M30 | 9.3 | Force a join to fail (stop the server mid-join, or block the mic) | The UI reports a failed connection **and** the microphone indicator goes out, rather than staying captured |
| M31 | 9.1 | Join a call with several participants and video on, then open the stats popover | The call is visibly smoother when the popover is closed, and the popover still updates once a second while open. The screen share card still shows its codec |
| M26 | 8.5 | Open an unread channel with the server stopped, then watch the unread badge | The badge clears optimistically and comes back when the call fails, instead of staying cleared until refresh |
| M27 | 8.10 | Kill the server while the app is open, then bring it back | The UI shows its disconnected state rather than silently freezing, and recovers on reconnect |
| M28 | 8.7/8.3 | Play a notification sound, and watch typing indicators and the voice participant list with several users | Sounds still play from their new location, typing indicators name the right people, and voice participants render correctly |
| M23 | 7.4 | Send a message with a github emoji and one with a custom server emoji, then reload | Both still render. This is the change most likely to break emoji, since image sources are now filtered |
| M24 | 7.7 | Restart the server, then open the activity log | The `SERVER_STARTED` entry is no longer attributed to the owner. Confirm the log renders a missing user sensibly rather than blank or crashing |
| M25 | 7.9 | With two clients connected, close one and watch presence | The user stays online while the other tab is open and goes offline when the last one closes. This replaced the scan that decided that |
| M22 | 7.3 | Send messages containing an emoji, a mention, a channel reference and a hard line break, and check they render as before | All four still render correctly. This is the change most likely to have a visible regression, since it filters the class attribute |
| M21 | 7.1 | Open the app in two tabs as the same user, then ban that user from a third session | Both tabs disconnect, not just one. Repeat with kick, and with deleting the account |
| M19 | 6.2/6.12 | Install or reinstall a real plugin, toggle it off and on, and check the server logs | It loads and reloads correctly. `ctx.log` still works (deprecated). The one breaking change is that a plugin without an `onUnload` export now fails to load |
| M20 | 6.5 | Install a plugin whose bundle is very large or whose host stalls | The install fails with a size or timeout error and leaves no partial file in the downloads directory |
| M15 | 5.2 | Fill the server past its storage quota with `DELETE_OLD_FILES` set, then check avatars, emojis and the logo | Old message attachments are reclaimed; avatars, custom emojis and the server logo are all still there |
| M16 | 5.4 | As the owner, try to open a DM channel between two other users; then use a private channel you do have access to | The DM is refused with the membership message, the private channel still works normally |
| M11 | 4.5 | Claim ownership with the secret token on a fresh server, then try the same token again | First succeeds, second is refused with "You already have the owner role." Existing sessions and image/file URLs keep working afterwards |
| M10 | 4.4 | Join voice, then toggle camera/screenshare repeatedly and reconnect a few times | Memory and port usage stay flat, old streams do not linger, and the user's own video keeps working after repeated toggles |
| M42 | 12.1 | Connect, then restart the server (or drop the network for ~10s). Watch the app, not the connect screen | The channel stays on screen behind a "Reconnecting" banner, then the banner clears and messages/presence resume without a reload. **This is the whole point of the change: you should never be returned to the login screen.** Repeat with a longer outage (>30s) to confirm it gives up and shows the disconnected screen |
| M43 | 12.1 | While connected, get kicked and then banned from another session. Separately, hit Disconnect in the UI, and refresh the page (Firefox especially) | Kick and ban still end the session immediately and show their own screens, with no reconnect attempts. Disconnect still logs out. A refresh still auto-logs-in, meaning the token was not cleared |
| M49 | 1.17 | Log in on two browsers, then change your password on one | The other is disconnected immediately and cannot reconnect with its old session. The one you changed it on stays connected. Log in again with the new password and confirm it works right away |
| M50 | 1.15 | On a server with real history, register a new account and time the login | It returns promptly, and the new user's channels all show zero unread. Post a message afterwards and confirm it shows as unread for them |
| M51 | 1.24 | Paste a link whose host resolves into 100.64.0.0/10 or another reserved range, and a normal public link | The reserved one gets no preview, the public one still does. SSRF blocking is stricter than before |
| M52 | 1.25 | Seek around in a large uploaded video or audio file, in Chrome and Safari | Seeking works in both. Safari leans on suffix ranges (`bytes=-N`), which the server previously answered 416 to |
| M53 | 1.25 | As two users behind the same network, have one spam a rate-limited action | Only the spammer is limited. Previously both shared a bucket |
| M54 | 1.25 | Change the server logo, then reload the PWA install prompt / manifest | The new logo and its dimensions are picked up. Dimensions are cached by file name now, so a changed logo must still refresh |
| M45 | 12.6 | Upload files named `café.png`, `文書.png`, `привет.txt` and `100%.txt`, then check how they appear in the channel and on disk | All four keep their real names. The CJK and Cyrillic ones are the important cases: before this change they were mangled to underscores, and a naive fix would have made them fail to upload at all |
| M46 | 12.7 | Attach five files to one message | They upload concurrently rather than one after another, every progress bar advances, and all five land on the message. Make one fail (oversized) and confirm the other four still attach |
| M47 | 12.2 | Log in, log out, and return to the connect screen | The identity field is prefilled with the last identity used. The password field is always empty |
| M48 | 12.3 | Exercise the app broadly: emoji picker, typing indicators, drafts, theme switching, voice quality menus, plugin commands and components | Nothing is missing. This removed 40 exports and 10 slice reducers, so a missed consumer would show up as a blank or broken control rather than a build error |
| M44 | 12.1 | On a server with a password and `onlyAskForPasswordOnFirstJoin` **off**, force a reconnect | The password dialog reappears over the still-visible app; entering it restores the session, cancelling logs out. The password is deliberately not stored, so a re-prompt is expected here |

## Progress

| #   | Chunk                                                              | Scope                                                                                        | Status  |
| --- | ------------------------------------------------------------------ | -------------------------------------------------------------------------------------------- | ------- |
| 1   | [Edge & auth](#1-edge--auth)                                       | `http/`, `utils/trpc.ts`, `utils/rate-limiters/`, `config.ts`                                | fixed (CSP open) |
| 2   | [Routers: messages, dms, files](#2-routers-messages-dms-files)     | `routers/messages/`, `routers/dms/`, `routers/files/`                                        | mostly fixed |
| 3   | [Routers: users & access](#3-routers-users--access)                | `routers/users/`, `roles/`, `invites/`, `categories/`, `channels/`                           | mostly fixed |
| 4   | [Routers: voice & plugins](#4-routers-voice--plugins)              | `routers/voice/`, `plugins/`, `emojis/`, `others/`, `runtimes/`                              | audited |
| 5   | [DB layer](#5-db-layer)                                            | `db/schema.ts`, `db/queries/`, `db/mutations/`, `db/publishers.ts`, `db/migrations/`         | audited |
| 6   | [Plugin subsystem](#6-plugin-subsystem)                            | `src/plugins/`, `packages/plugin-sdk`                                                        | audited |
| 7   | [Server leftovers](#7-server-leftovers)                            | `helpers/`, remaining `utils/`, `queues/`, `crons/`, `index.ts`, `logger.ts`                 | audited |
| 8   | [Client state](#8-client-state)                                    | `client/src/features/`                                                                       | audited |
| 9   | [Client voice](#9-client-voice)                                    | `voice-provider/`, `devices-provider/`, `audio-worklets/`                                    | audited |
| 10  | [Client channel view & editor](#10-client-channel-view--editor)    | `channel-view/`, `tiptap-input/`, `message-compose/`, `thread-sidebar/`                      | audited |
| 11  | [Client screens & chrome](#11-client-screens--chrome)              | `server-screens/`, `dialogs/`, `left-sidebar/`, `top-bar/`, `screens/`, remaining components | audited |
| 12  | [Shared & UI packages](#12-shared--ui-packages)                    | `packages/shared`, `packages/ui`, `client/hooks/`, `client/helpers/`, `client/lib/`          | mostly fixed |
| 13  | [Test suite](#13-test-suite)                                       | `server/src/__tests__/`, all `__tests__/`, `packages/e2e`                                    | mostly fixed |
| 14  | [Shared package reorganization](#14-shared-package-reorganization) | `packages/shared` — restructure, not just audit                                              | deferred to T9 |

Status values: `pending` → `in progress` → `audited` → `fixed`.

Chunk 1 is **mostly fixed**: 1.2 through 1.18 are done (1.13 partly, CSP deferred), and 1.1
was corrected to LOW. 1.15 was fixed against the finding's advice, inline with an index rather
than moved to a queue, and 1.17 with a token version rather than a timestamp, both for reasons
recorded in place. 1.16 needed no independent fix but turned up `/login` borrowing another
route's rate limiter. The LOW batch 1.19 through 1.25 is done, three of them with behaviour changes worth knowing
about (stricter SSRF blocking, no version in `/info`, user-keyed tRPC limits). **Still open: only the CSP half of 1.13**, which needs a
real browser. Every finding and every missing test in this chunk is otherwise closed.
Chunk 13 is **mostly fixed**: the MED batch is done (13.2, 13.3, 13.4, 13.6 partly, 13.7),
13.5 needed nothing because 2.6's fix already added its two cases, and 13.1 was dismissed as
intended along with 5.1. 13.6's coverage half is deferred to T8, and fixing it closed LOW 13.9
on the way. 13.2 and 13.3 were both verified against the broken behaviour, not just asserted
green. Still open: LOW 13.8, 13.10, 13.11, and F5, which was parked here and is untouched.
Chunk 12 is **mostly fixed**: 12.1 and the whole MED batch (12.2 to 12.7) are done, and 12.8
was closed with 12.3 since it was a subset of the same knip list. Two came with corrections
that reversed the suggested fix: 12.1 (a transport reconnect alone leaves the socket
unauthenticated, so the join is replayed instead) and 12.6 (deleting the filename mangling
would have made CJK and Cyrillic uploads throw, so it is percent-encoded instead). 12.2 was
half decision, restoring the identity writer and deliberately leaving stale values per M38.
Three of 12.3's five "unused" dependencies were knip false positives and were kept. Nothing is
verified by execution on the client side, see M42 to M48. 12.1 spun off T6 and T7. Only LOW
12.9 is open.
Chunk 11 is **mostly fixed**: 11.1 on the read side, and the MED batch 11.2, 11.3, 11.4
(scoped by measurement to the two sites that cost anything), 11.5 (two fixes, consent
flagged as F8) and 11.7. 11.6 is deferred to T5. LOW 11.8 is open.
Chunk 10 is **mostly fixed**: the MED batch (10.3 to 10.7) is done, on top of 10.1 (fixed
with 2.2) and 10.2 (corrected to LOW during the audit). LOW 10.8 and 10.9 are open.
Chunk 9 is **mostly fixed**: HIGH (9.1 to 9.3) and MED (9.5 to 9.11) are done, two of them
with corrections to the finding (9.1 on who consumes the stats, 9.11 on which mediasoup event
is actually equivalent). 9.4 is deferred to T4 by decision. LOW 9.12 to 9.15 are open, and
9.15 is now part of T4.
Chunk 8 is **mostly fixed**: 8.1 (with a correction that also rewrote the guide's selector
section), and the MED batch 8.2 to 8.10. 8.2 is partly fixed and 8.4 fixed as documentation,
both by decision, and 8.6 left as is. The LOW batch 8.11 to 8.14 is still open, and 8.15 was
closed with 8.4. Everything here is unverified by tests, since the client has none: the
selector behaviour was checked by running the real modules against a synthetic store.
Chunk 7 is **mostly fixed**: HIGH (7.1 to 7.3) and MED (7.4, 7.6, 7.7, 7.9 to 7.11) are
done. 7.5 was ignored and 7.8 left as is, both by decision. The LOW batch, 7.12 to 7.19,
is still open.
Chunk 6 is **mostly fixed**: 6.5, 6.6, 6.8, 6.9, 6.11 to 6.14 are done, and 6.2 came with a
correction that reversed the finding. 6.1 and 6.4 were dismissed as intended, 6.3 flagged as
F7, 6.7 and 6.15 put out of scope, and 6.10 was already fixed as 4.11. Nothing is left open
in this chunk except what was deliberately deferred.
Chunk 5 is **mostly fixed**: 5.0 and 5.10 were already done in earlier chunks, 5.1 was
dismissed as intended, and the HIGH (5.2 to 5.4) and MED (5.5 to 5.9, 5.11 to 5.14) batches
are done, 5.13 partly and deliberately. Still open: the LOW batch, 5.15 to 5.20.
Chunk 4 is **in progress**: 4.2 through 4.6 and 4.8's logging half, 4.9 through 4.15 and
4.19 are fixed. 4.1 was dismissed by decision, 4.7 deferred to T2. Still open: the LOW batch
(4.16 through 4.22, minus 4.19) and the storage half of 4.8.
Chunk 3 is **mostly fixed**: 3.1 through 3.12, 3.14 aside, and every LOW (3.17 through
3.27) are done. Three are deliberately partial and are noted in place: 3.13 and 3.15 fixed
everything except token revocation, which belongs with 1.17; 3.8 capped `get-user-info` and
left the server-bounded admin lists unpaginated; 3.16 added the missing existence
validation and left the permission-matrix storage shape alone. **3.14 (kick is cosmetic)
was not touched** because it needs a product decision, see the flagged list.
Chunk 14 is a restructuring step, not a review step, and is **deferred in full to T9**: its
layout needs approval before anything moves, and it splits into severing the
`shared` to `apps/server` edge (14.1, the only part that changes runtime behaviour) and the
folder restructure. 14.2 and half of 14.5 were already closed by chunk 12.

---

## 1. Edge & auth

Scope: `apps/server/src/http/**`, `utils/trpc.ts`, `utils/rate-limiters/**`, `config.ts`.
Files outside the scope are pulled in only where the edge depends on them
(`helpers/get-ws-info.ts`, `helpers/network.ts`, `helpers/apply-env-overrides.ts`,
`utils/file-manager.ts`); those get a full pass in their own chunk, the finding here is
about how the edge uses them.

### CRIT

_None. The finding previously recorded here was wrong; see 1.1 below._

### HIGH

**1.1 — [CORRECTED, downgraded from CRIT to LOW] `http/upload.ts` — the declared upload
size is not attacker-controlled.** The original finding claimed
`UploadHeaders.CONTENT_LENGTH` was a custom client header, making the size check and the
stored `files.size` a client-chosen number, and disk exhaustion trivial. That is wrong:
`UploadHeaders.CONTENT_LENGTH = 'content-length'`
(`packages/shared/src/statics/permissions.ts:38`) is the **standard HTTP header**, which
the browser sets from the `File` and which the HTTP parser enforces.

Verified rather than assumed: a raw socket declaring `Content-Length: 1` and then writing
1 MB delivers exactly **1 byte** to the handler, on both Bun and Node. The parser frames
the body at the declared length, so the write stream cannot be fed past it. Requests using
`Transfer-Encoding: chunked` carry no `content-length`, so `zHeaders.parse` throws and the
route returns 400 before anything is piped to disk. Neither disk exhaustion nor quota
bypass is reachable, and `files.size` matches the bytes written for any well-formed
request.

What is left is defence in depth, at LOW: nothing verifies that the bytes actually written
equal the declared length before `addTemporaryFile` records it, and there is no byte cap
on the write itself. Taking the size from `fs.stat(safePath).size` after `finish` costs
one syscall and removes the assumption entirely.

The real problems on this route are 1.4 (banned users can upload) and 1.5 (no rate
limiter), which stand unchanged.

**1.2 [FIXED] — `helpers/get-ws-info.ts:120-155`, used by `http/login.ts:148` and
`utils/trpc.ts:97` — forwarded-for headers are trusted with no trusted-proxy config.**
`getWsIp` reads `cf-connecting-ip`, `true-client-ip`, `x-real-ip`, `x-client-ip`,
`x-forwarded-for`, `forwarded` before falling back to the socket address, and
`pickBestIp` explicitly prefers the first *public* address in the list. Nothing checks
whether the connection came from a proxy the operator trusts. A direct client sends
`X-Real-IP: 1.2.3.4` and gets a fresh rate-limit bucket per request. That defeats:

- the `/login` limiter (`http/login.ts:52`, 5 per minute), so passwords can be brute
  forced without limit, against a policy that allows 4-character passwords
  (`http/login.ts:47`);
- every `rateLimitedProcedure` in the app (`utils/trpc.ts:109`);
- the argon2 cost limiter, so `Bun.password.hash` (`http/login.ts:79`) becomes an
  unauthenticated CPU exhaustion primitive;
- the IP recorded in activity logs and `saveUserIp`, which becomes attacker-chosen.

Fix: an explicit `server.trustedProxies` config (empty by default). Only consult
forwarded headers when `req.socket.remoteAddress` is in that list, and then take the
hop-count-th entry from the right of `x-forwarded-for`, not the first public-looking one.
Direct deployments must key on the socket address only.

Fixed: `server.trustedProxies` (`config.ts:29`, empty by default, `SHARKORD_TRUSTED_PROXIES`)
gates every forwarded header behind `isTrustedProxyAddress`, matching exact addresses and CIDR
ranges. **This was done long ago and the marker was simply never added here**, which is worth
recording as its own small lesson about the bookkeeping. Covered end to end by
`__tests__/connection-context.test.ts` (added in 13.3), whose spoofing cases were verified to
fail with the gate removed.

**1.3 — [FIXED] `http/helpers.ts:28-47` — `getJsonBody` buffered an unbounded body.**
`body += chunk` with no cap, called from the unauthenticated `/login` route
(`http/login.ts:140`) before any rate limiting has run. One request with a multi-GB body
killed the process.

Fixed: `getJsonBody` now counts bytes, destroys the request and rejects with
`PayloadTooLargeError` past `config.server.maxRequestBodyBytes` (256 KB default), which
`http/index.ts` maps to a 413. It also concatenates the chunks before decoding, so a
multi-byte character split across two chunks is no longer mangled.

The slowloris half of the original finding was wrong: the code does not set
`requestTimeout` / `headersTimeout`, but Bun applies Node's defaults
(`headersTimeout: 60s`, `requestTimeout: 300s`, `keepAliveTimeout: 5s`), verified at
runtime. Nothing to do there, and lowering `requestTimeout` would break slow uploads,
which share the same server.

**1.4 — [FIXED] `http/upload.ts:38` — banned users could still upload.**
`getUserByToken` (`db/queries/users.ts:341`) verifies the JWT and loads the user, and
never looks at `banned`. The WebSocket handshake does check it (`utils/wss.ts:69`), so
the ban is enforced on tRPC and silently not enforced on the one route that writes to
disk. A banned user keeps a valid 7-day token and keeps consuming storage quota.
Fixed: `getUserByToken` (`db/queries/users.ts:341`) now returns `undefined` for a banned
user, so every consumer inherits it; `utils/wss.ts` dropped its now-redundant second
check. A banned user gets 401 on `/upload` and `Invalid authentication token` on connect.
Covered by two new tests (`upload.test.ts`, `users.test.ts`).

**1.5 — [FIXED] `http/upload.ts` — no rate limiting on the upload route.**
AGENTS.md security order step 2 names uploads explicitly. `/upload` has none, so the
only throttle on writing files to disk is the per-user storage quota, which 1.1 already
bypasses. `/info`, `/manifest.json` and `/public` are also unlimited; `/manifest.json`
runs `imageSizeFromFile` per request (`http/manifest.ts:50`), which is unauthenticated
disk work.
Fixed for `/upload` only (the unauthenticated read routes were left alone by decision):
new `config.rateLimiters.upload` (30/min, since the client uploads one request per file),
enforced in `upload.ts` before the headers are parsed. The 25-line inline limiter block in
`login.ts` was extracted to `enforceHttpRateLimit` in `http/helpers.ts` and both routes now
share it, so this did not add a second copy. Covered by a new test that walks the bucket
to 429.

**1.6 — [FIXED] `http/login.ts:176-235` — registration and invite consumption were not atomic.**
`isInviteValid` (`db/queries/invites.ts:9`) reads `uses` and `maxUses`, then line 194
increments `uses` in a separate statement: two concurrent requests both pass the
`uses >= maxUses` check and both register. The invite increment also happens *before*
`registerUser`, so a failure inside `registerUser` (for example the
`Default role not found` invariant at line 83) burns the use with no user created. The
three writes (invite increment, user + roles, read-state backfill) are four separate
statements with no `db.transaction()`, against AGENTS.md's transaction rule.
Fixed: the increment is now conditional
(`where(and(eq(code), or(isNull(maxUses), lt(uses, maxUses))))`), so the database enforces
the cap and a losing racer gets "This invite code has reached its maximum uses". The
increment, user insert, role inserts and read-state backfill run in one **synchronous**
`db.transaction` (see 5.0), and `publishUser` / `enqueueActivityLog` moved after the
commit so a rollback leaves no trace outside the database. Two new tests in
`login.test.ts` cover concurrent redemption of the last use and rollback of a failed
registration; the rollback test is what uncovered 5.0.

### MED

**1.7 — [FIXED] `http/interface.ts:33`, `http/plugin-bundle.ts:65,71` — path containment
by bare `startsWith`.** `requestedPath.startsWith(basePath)` accepts a sibling directory whose
name merely has `basePath` as a prefix. With `INTERFACE_PATH = /data/interface`, a
request for `../interface-backup/.env` resolves to `/data/interface-backup/.env` and
passes. Same for `PLUGINS_PATH`: `pluginId = '../plugins-old'` clears the check on line
65, and `foo/../foo-evil/x` clears line 71. Three sites, same bug.
Fixed: `isPathInside(base, target)` in `helpers/paths.ts`, next to the path constants it
guards, resolving both sides and requiring either equality or a separator boundary. All
three call sites use it. Eight new tests in `helpers/__tests__/paths.test.ts` cover the
sibling-prefix case, escaping traversal, and a traversal that legitimately stays inside.

**1.8 — [FIXED] `http/plugin-bundle.ts` — served any file under any plugin directory.**
The only gate is the global `enablePlugins`. There is no check that `pluginId` names a
plugin that is actually loaded or enabled, and no allowlist of servable files, so a
plugin's server-side sources and any config or credential file dropped in its directory
are downloadable by anyone.
Fixed: the route now serves exactly `CLIENT_ENTRY_FILE` (`client/index.js`, the one URL
`processPluginComponents` builds) and only for a plugin the state store reports as
enabled; everything else is a 404. The sub path is a constant by the time it reaches
`path.resolve`, so the second containment check became dead and was removed.

Five tests were rewritten because they fetched `server/index.js`, which is precisely the
file that should never have been reachable, plus new tests asserting the server entry, the
manifest, an arbitrary `secrets.env` and a disabled plugin all 404.

Note for plugin authors: a plugin that shipped extra client assets (images, css) can no
longer serve them from this route. Nothing in the repo does, but it is a public API
change.

**1.9 — [FIXED] `config.ts:179-186` — env overrides bypassed validation.**
`zConfig.parse` runs at line 166, `applyEnvOverrides` at line 179, and nothing
re-validates. `helpers/apply-env-overrides.ts` does `JSON.parse` with a raw-string
fallback, so `SHARKORD_PORT=abc` yields `config.server.port === 'abc'` and the failure
surfaces later as an unrelated `listen` error. `applyEnvOverrides` also walks the key
path without checking each level exists, so a typo'd map key throws on `current[key]`.
Fixed: `config = zConfig.parse(applyEnvOverrides(...))`, so an invalid override refuses to
boot with an explicit zod error naming the key (verified: `SHARKORD_PORT=abc` now fails at
startup with "expected number, received NaN" instead of surfacing later as a listen
error). `applyEnvOverrides` also stops walking when an intermediate key is missing rather
than throwing on the next lookup, covered by two new tests.

The two new config keys got env overrides while here, `SHARKORD_MAX_REQUEST_BODY_BYTES`
and `SHARKORD_TRUSTED_PROXIES`; the latter accepts a comma separated list, which also
answers the discoverability gap noted under 1.2 for container deployments.

**1.10 — [FIXED] `config.ts:12-15` — boot blocked on three third-party HTTP calls with no
timeout.** Top-level `await getPublicIp()` in a module that almost everything imports.
`helpers/network.ts` tries icanhazip, then ipify, then ifconfig.me, sequentially, each
with a bare `fetch` and no `AbortSignal`. A hanging or blackholed endpoint hangs server
startup indefinitely with no log line. Also worth a product decision: a self-hosted
server phones out to three third parties on every boot, with no opt-out.
Fixed: every attempt now carries `AbortSignal.timeout(3000)`, so the worst case is nine
seconds instead of unbounded, and a total failure prints one actionable line pointing at
`webRtc.announcedAddress` (via `console`, since `logger` imports `config` which imports
this file). The lookup was also moved below the config resolution and is skipped entirely
when `webRtc.announcedAddress` is set, because `utils/mediasoup.ts:50` is the only
consumer and it prefers the configured value anyway. Verified: with the announced address
set, config resolves in 39 ms and makes no outbound call. `print-debug` now shows the
configured address rather than `undefined`.

**1.11 — [FIXED] `http/index.ts:225-228` — the HTTP server's `close` event called
`process.exit(0)`.** Any close, including a graceful shutdown of just this listener,
took down mediasoup, the WSS and the DB handle with exit code 0, so a supervisor saw a
clean exit and may not have restarted.

Fixed: the handler now only logs. The process lives or dies by its own event loop, and if
nothing else keeps it alive after the listener closes it exits naturally. Real shutdown
sequencing (SIGINT/SIGTERM closing the HTTP server, the WSS, mediasoup workers and the
database in order) still does not exist and remains worth adding; the exit call was
standing in for it.

**1.12 — [FIXED, partly reframed] `utils/rate-limiters/index.ts:87-107` — the GC evicted
one arbitrary entry per request when full.**
`gc` only runs at `maxEntries` (10k). If every entry is still live it deletes exactly one
entry, in *insertion* order, per request. A flood from many keys keeps the map pinned at
the cap and evicts the oldest live entry on every call, which is frequently a key that is
mid-window, handing it a fresh allowance. Combined with 1.2 (attacker-chosen keys) the
limiter can be flushed on demand.
Fixed: the sweep for expired entries is unchanged, but when everything is still live it
now drops a batch (10% of the table) chosen by nearest `resetAt` rather than one entry in
insertion order. A `size` accessor was added so the eviction policy can be asserted
without probing keys, which perturbs the table.

Correcting the original framing while fixing it: the claim that an attacker could "flush
the limiter on demand" was overstated. A flood of fresh keys evicts the old ones under
either policy, and batching actually evicts slightly faster. The two real defects were
(a) insertion order is not expiry order once an expired key is re-created in place, so the
old code could evict a just-created live entry while keeping one about to expire anyway,
and (b) at capacity, *every* request ran a full O(maxEntries) sweep, 10,000 iterations per
request at the default. Batching gives the table headroom so the sweep amortizes.

**1.13 — [PARTLY FIXED] `http/index.ts:94-99` — no security headers, blanket CORS.**
`Access-Control-Allow-Origin: *` plus `Access-Control-Allow-Headers: *` on every
response, including `/public`, and no `X-Content-Type-Options: nosniff` anywhere. Files
are served from the app's own origin with a `mimeType` derived from the uploaded content
(`utils/file-manager.ts`, `bunFile.type`), and `INLINE_ALLOW_LIST`
(`http/public.ts:20`) is the only thing keeping content off `Content-Disposition:
inline`. Missing `nosniff` gives sniffing browsers a second chance at that decision, and
there is no CSP on the interface HTML.
Fixed: `X-Content-Type-Options: nosniff` is now set on every response, and CORS moved into
`applyCorsHeaders` in `http/helpers.ts` driven by a new `server.allowedOrigins`
(`SHARKORD_ALLOWED_ORIGINS`). It defaults to `['*']`, which preserves today's behaviour;
once an operator lists origins, only a matching `Origin` is echoed back and `Vary: Origin`
is set so a shared cache cannot serve one origin's response to another. Three tests.

**Still open:** no CSP on the interface route. Deferred deliberately, not forgotten: the
app loads plugin bundles through dynamic `import()` and creates audio worklets from
`blob:` URLs, so a policy written without a browser to verify against would break plugins
or voice. Needs a manual pass in a real browser.

**1.14 — [FIXED, with 1.18] `http/public.ts:130,142`, `http/interface.ts:39,45`,
`http/plugin-bundle.ts:79,85` — synchronous filesystem calls on the request path.**
`fs.existsSync` + `fs.statSync` on every file request, in a single-process server that
also runs SQLite and the SFU signalling. Each one stalls the event loop for every other
connection. `existsSync` followed by `statSync` is also a redundant syscall and a TOCTOU
window.
Fixed together with 1.18: a single `sendFile(req, res, path, options)` in
`http/helpers.ts` now does one `await fsPromises.stat()` in a `try/catch` (ENOENT and
"not a regular file" are both the 404), the etag, the conditional request, range handling
and the stream error handling. No `existsSync` or `statSync` remains anywhere in `http/`.
The three routes shrank to 121, 46 and 99 lines.

**1.15 [FIXED] — `http/login.ts:214-234` — first login runs a full-table aggregate and a bulk
insert inline.** Every new registration does a `groupBy(messages.channelId)` over the
whole `messages` table plus one insert per channel, on the request path, inside the
unauthenticated login handler. On a server with real history this is the slowest thing
the process does, and 1.2 lets it be triggered at will.
Fix: move the read-state backfill to `queues/`, and keep the aggregate cheap (it needs
`messages(channelId, id)` covering the `parentMessageId IS NULL` filter, see chunk 5).

**1.16 [FIXED] — `http/login.ts:176-210` — unauthenticated account creation is the default
path.** With `allowNewUsers` on, any unknown identity creates a user, an argon2 hash and
the backfill above. Rate limited to 5/min/IP in theory, unlimited in practice per 1.2.
Not a bug on its own, but it is what makes 1.2 and 1.15 expensive, so the three should be
fixed together.

**1.17 [FIXED] — `http/login.ts:283` — 7-day JWTs with no revocation.** Banning a user, deleting
them or changing their password does not invalidate tokens already issued. `getUserByToken`
re-reads the user, so a `banned` check there (1.4) closes the ban case, but password change
and account deletion still leave live tokens.
Fix: a token version / `tokensValidAfter` column on `users`, compared in
`getUserByToken`. Flagged here, resolved in chunk 3 with the users routes.

**Fix records for 1.15, 1.16 and 1.17.**

*1.15* was **not** fixed the way the finding proposed. It suggested moving the read-state
backfill to `queues/`. That trades a real correctness property for the performance one: the
backfill exists so a new user does not see every historical message as unread, and running it
asynchronously means the flood appears whenever the user joins before the queue drains, which
is longest on exactly the large servers where the query is slow. It would also add to the
queue-outlives-the-test-database problem in F5.

Fixed inline instead, by making the query cheap enough not to matter. The old shape grouped
over the whole `messages` table; the new one is driven off `channels`, which has tens of rows,
with a correlated `max(id)` subquery per channel, plus a new index
`messages_parent_channel_id_idx` on `(parentMessageId, channelId, id)` (migration 0022) that
puts the filter column first so the seek is possible at all.

Measured on 500k messages across 40 channels: **~100ms before, ~0.02ms after**. Both halves are
needed. The index alone leaves the group-by at 25ms, and the per-channel shape without the
index is 496ms, worse than the original.

The rewrite shipped a silently wrong query first, caught by a new test. Drizzle interpolates a
bare `${messages.channelId}` as an **unqualified** `"channel_id"`, so the correlated predicate
compiled to `where "channel_id" = "id"`, comparing two `messages` columns and giving every
channel the same answer. Embedding a nested query builder instead of hand-writing the fragment
produces the qualified `"messages"."channel_id" = "channels"."id"`. Worth remembering: a raw
`sql` fragment referencing two tables cannot be trusted to qualify itself.

*1.16* had no independent fix left. Its own text says it is "not a bug on its own", and the
DoS half died with 1.2: registration cost is now bounded by a limiter keyed on a real socket
address. What the pass did find is that **`/login` was borrowing
`config.rateLimiters.joinServer`**, so tuning the join limit silently retuned brute-force
protection on the password endpoint. It now has its own `rateLimiters.login` key, with the
same 5/60s default so behaviour is unchanged, and a test that exhausts it.

*1.17* is fixed with a **token version rather than the `tokensValidAfter` timestamp** the
finding suggested, after the timestamp version was built and rejected. `iat` has one second of
precision, which makes the same-second case ambiguous in both directions: comparing strictly
rejects the replacement token the user just logged in with, and comparing loosely accepts a
token minted in the same second as the change. There is no threshold that fixes both. A
`users.token_version` integer (migration 0023) stamped into the jwt and compared on verify has
no precision to lose. Tokens predating the mechanism carry no version and are read as 0, so
existing sessions survive the upgrade.

`updatePassword` increments it and additionally closes the user's **other** sockets, keeping
the caller's own: the version check only gates new connections, so a session that authenticated
before the change would otherwise stay live for the rest of the token's 7 days, which is the
actual threat when someone changes their password because a token leaked.

Account deletion needed nothing. The finding says it "still leaves live tokens", but
`delete-user.ts` really deletes the row, so `getUserById` returns undefined and the token is
already refused.

Related work not done here: this same mechanism is what F3's kick option and 3.13/3.15 were
waiting on. They are now unblocked, since `token_version` can be bumped by any route that
needs to end a user's sessions.

### LOW

**1.18 — [FIXED] the file-serving pipeline was written three times, and the copies had
drifted.**
`http/public.ts:30-58,128-231`, `http/interface.ts:39-99`, `http/plugin-bundle.ts:79-136`
all do: exists → stat → build etag → `sendNotModified` → `createReadStream` → pipe →
error handler → `res.on('close')` destroy. Differences between the copies, each of which
is a bug in one of them:

- `public.ts` supports `Range`, the other two advertise nothing and ignore the header;
- `interface.ts` destroys the socket when the stream errors after headers, `plugin-bundle.ts`
  silently leaves the response hanging, `public.ts` also does nothing;
- `interface.ts` and `plugin-bundle.ts` take `Content-Length` from `Bun.file(...).size`
  after already having `stats.size`, so each request stats the file twice;
- `public.ts:55` and `plugin-bundle.ts:134` add a redundant `fileStream.on('end', res.end)`
  on top of `pipe`, `interface.ts` does not.

Fixed: one `sendFile` in `http/helpers.ts`, three call sites, all four drifts resolved in
the direction of the best copy:

- range support is now available on all three routes rather than only `/public`;
- the stream error handler destroys the socket when the headers are already sent
  (previously only `interface.ts` did), and returns a 500 otherwise;
- `Content-Length` comes from the single `stat` rather than a second `Bun.file()` lookup;
- the redundant `fileStream.on('end', res.end)` is gone, `pipe` already does it.

Behaviour change worth noting: `/interface` and `/plugin-bundle` now advertise
`Accept-Ranges: bytes` and honour `Range`, which they previously ignored.

**1.19 [FIXED] — `sendJsonError` exists and 13 call sites ignore it.**
`http/index.ts:110,154,197,203,210,215`, `http/upload.ts:33,42,52,66,96,104`,
`http/login.ts:161` hand-write `res.writeHead(n, {'Content-Type':'application/json'})` +
`res.end(JSON.stringify({ error }))`, so those responses also miss the `Cache-Control:
no-store` that `sendJsonError` sets.

**1.20 [FIXED] — URL parsing is redone per handler, and the context that would prevent it is
unused.** `http/index.ts:107` computes `pathname` via `getRequestPathname`, then
`public.ts:69` and `plugin-bundle.ts:31` each build a fresh `new URL(req.url, ...)` and
`interface.ts:23` hand-rolls `split('?')[0]`. Meanwhile `RouteContext` (`index.ts:28`)
carries `info` to every handler and **no handler reads it** — `login.ts:148` calls
`getWsInfo(undefined, req)` again for itself. Either pass `{ info, pathname, url }` and
use it, or drop the context parameter.

**1.21 [FIXED] — `http/index.ts:66-86` — every route entry is a pointless arrow wrapper.**
`'/healthz': (req, res) => healthRouteHandler(req, res)` for all nine routes. The handler
references work directly.

**1.22 [FIXED] — `config.ts:28-77` — the rate-limiter schema is the same four lines pasted twelve
times.** `const zRateLimiter = z.object({ maxRequests: ..., windowMs: ... })` reused for
each key cuts ~45 lines and makes adding a limiter a one-liner. Same shape repeats in
`defaultConfig`, which is fine, that one is data.

**1.23 [FIXED] — organization nits in `http/`.**
`http/utils.ts` is a 12-line file named "utils" holding one error class; it should be
`http-validation-error.ts` (and AGENTS.md reserves `utils/` for infrastructure, which a
domain error class is not). `http/upload.ts:109` re-exports `sanitizeFileName` from
`./helpers` purely so the test can import it from there.

**1.24 [FIXED] — two IP classifications with different rules.**
`helpers/get-ws-info.ts:92` `isPublicIp` (allow only `unicast`) and
`helpers/network.ts:66` `isPrivateIP` (blocklist of seven ranges). They are the same
question asked twice with two answers; `carrierGradeNat` and `reserved` are handled
differently by each. Pick one, export it once.

**1.25 [FIXED] — smaller items, grouped.**

- `config.ts:188` — `Object.freeze` is shallow, `config.server.port = 1` still works.
- `http/public.ts:72` — `db.select()` selects every column of `files` when the handler
  uses six of them.
- `http/public.ts:178,193` — `Range` support only matches `bytes=N-M`. Suffix ranges
  (`bytes=-500`) 416, and an out-of-range `end` 416s instead of clamping, which RFC 7233
  requires. `bytes=0-` on a zero-byte file also 416s.
- `http/manifest.ts:50` — `imageSizeFromFile` on every request for a value that changes
  only when the logo changes.
- `http/info.ts:14` — `/info` publishes the exact server version pre-auth, which is a free
  version-match for anyone scanning for a known-vulnerable release.
- `helpers/get-ws-info.ts:6-7` — the file's own comment is "have no fucking idea what's
  going on in this file / 100% trusting AI on this one", on the code that decides every
  rate-limit key and every logged IP. Whatever else happens to it, it needs an owner who
  has read it (see 1.2).
- `utils/rate-limiters/index.ts:38` — `globalThis.disableRateLimiting` is a test hook in
  production code, and rate limiting is fully off in development, so no dev ever exercises
  it.
- `utils/trpc.ts:109` — limiter keys are IP-only even on authenticated procedures, where
  `ctx.userId` is available and is the more meaningful subject. One NAT'd office shares a
  bucket today.

**Fix records for the LOW batch.**

*1.19* every error response in `http/` now goes through `sendJsonError`, so all of them carry
`Cache-Control: no-store`. `enforceHttpRateLimit`'s own 429 was a site the finding missed. The
two `{ errors: fieldMap }` responses use a new `sendJsonFieldErrors`: same headers, different
body, because the client's `useForm` reads that shape and merging the two would have changed
the contract.

*1.20* `RouteContext` is now `{ info, pathname, url }` and is actually used. `getRequestPathname`
became `getRequestUrl`, called once per request, and `public.ts`, `plugin-bundle.ts` and
`interface.ts` take the parsed `url` instead of each building their own. That removes three
redundant `new URL` calls and one hand-rolled `split('?')[0]`. `info` earns its place too:
`login.ts` and `upload.ts` were each calling `getWsInfo` again for themselves.

*1.21* the nine arrow wrappers are gone, the handler references sit in the table directly.

*1.22* `zRateLimiter` replaces **20** copies of the same four-line schema.

*1.23* `http/utils.ts` is now `http/errors.ts` (it holds two error classes, so `errors` is the
honest name rather than the finding's `http-validation-error`). The `sanitizeFileName`
re-export from `upload.ts` is deleted: the test already imported it from `./helpers`, so the
re-export was not even serving the purpose it was added for.

*1.24* one classification, `isPublicIp` in `helpers/network.ts`, with
`isPrivateIP = !isPublicIp` kept as the name the SSRF guard already uses. `get-ws-info.ts`
imports it instead of declaring its own. **This tightens SSRF blocking**: the old blocklist of
seven ranges let `carrierGradeNat`, `reserved` and anything else ipaddr does not name through,
and the allowlist-of-unicast approach refuses them. A link preview for a host resolving into
100.64.0.0/10 is now declined, which is the correct answer.

*1.25*, item by item:

- config is deep frozen, so `config.server.port = 1` throws instead of silently succeeding.
  The freeze is skipped under test, since tests need to vary individual settings and mocking
  the whole module is worse; `deepFreeze` has its own test so the logic stays covered. Adding
  it immediately broke the two chunk-13 tests that mutate `trustedProxies`, which is the
  finding demonstrating itself.
- `public.ts` selects the five columns it uses instead of every column of `files`.
- `Range` handling moved into `parseByteRange`, covering the three gaps: suffix ranges
  (`bytes=-500`), clamping an end past EOF instead of answering 416 as RFC 7233 requires, and
  a zero-byte file refusing every range. Nine assertions.
- the manifest caches logo dimensions by file name, which is content-addressed, instead of
  probing the file on every request.
- `/info` no longer publishes the exact version pre-auth. Nothing read it: the connect screen
  shows the build-time `VITE_APP_VERSION`, and `TServerInfo.version` had no other consumer.
  The field is now optional rather than removed, so the type stays compatible.
- `globalThis.disableRateLimiting` is honoured only under `IS_TEST`, so it can no longer act as
  a production kill switch. Rate limiting is still off in development, which the finding also
  objects to; left alone deliberately, since turning it on would change every contributor's
  local experience for a reason no one asked for.
- tRPC limiter keys prefer `ctx.userId` over the IP, so one NAT'd office no longer shares a
  bucket. **This changes what chunk 13's spoofing test was proving**: with a user-keyed limiter,
  a forwarded header cannot matter, so the test would have passed for the wrong reason. It was
  rewritten around the new subject (same user across two addresses stays limited; a second user
  behind the same address does not), and the IP-spoofing case moved to `/login`, which stays
  IP-keyed because there is no authenticated user yet. That also closes the one real gap left
  in this chunk's missing-tests list.

The `get-ws-info.ts` header comment the finding quotes was already gone.

### Missing tests

`http/__tests__` is otherwise thorough (upload path traversal, public signed URLs,
caching, plugin routes), which makes the gaps specific:

- no test that the bytes written match the declared `content-length` (1.1). The suite
  passes `file.size.toString()` everywhere, which is always truthful, so the assumption is
  never exercised.
- ~~no test for `applyEnvOverrides` producing an invalid config (1.9)~~ — **added**,
  `__tests__/config.test.ts`, 10 cases. `applyEnvOverrides` does no validation by design, so
  what these cover is the pairing with the `zConfig.parse` wrapped around it in `config.ts`:
  a non-numeric port, a negative port, a fractional port, a value that parses as JSON into an
  object, an out-of-range bitrate, and a list whose entries are empty are all refused, while
  a valid override and a comma separated list are accepted. The real `envOverridesMap` is
  imported rather than copied, so a renamed variable fails here too, and `zConfig`,
  `defaultConfig` and `envOverridesMap` were exported from `config.ts` to make that possible.
  Verified against the pre-1.9 behaviour: with the `zConfig.parse` removed, **7 of the 10
  fail**.

**Chunk 1's missing-tests list is now empty.**

Closed since this list was written, verified by re-reading the suites: a banned user cannot
upload (1.4, `upload.test.ts`), the invite `maxUses` race (1.6, `login.test.ts`), the
`maxEntries` eviction path (1.12, `rate-limiter.test.ts`), and the sibling-directory escape
(1.7, covered in both `plugin-bundle.test.ts` and `interface.test.ts`). 1.2's spoofing case against `/login`
was added with 1.25, and is now the right place for it: the tRPC limiter keys on the user, so
`/login` is the only limiter where a forwarded header could still matter.

## 2. Routers: messages, dms, files

Scope: `routers/messages/**` (13 files), `routers/dms/**`, `routers/files/**`. Pulled in
where the routes depend on them: `db/queries/dms.ts`, `helpers/assert-channel-access.ts`,
`utils/wss.ts` (the permission context), `db/schema.ts` (messages table).

The permission checks in these routes are consistent and mostly correct: every route loads
the row first, then `assertChannelAccess`, then the owner-or-`MANAGE_MESSAGES` check, in
that order. The problems are in what is *not* bounded, what is not transactional, and one
gap in the permission primitive itself.

### HIGH

**2.1 — [corrected in chunk 3, downgraded to MED] `utils/wss.ts:113` — channel permission
overrides are stored but never enforced on public channels.** `hasChannelPermission`
short-circuits with `if (!channel.private) return true;` before looking at any role or
override, for **any** `targetPermission`, so `ChannelPermission.SEND_MESSAGES` is
unconditionally true in every public channel.

This is intended and disclosed: the channel settings UI shows a destructive alert on
public channels reading "These permissions will not be applied unless the channel is set
to private" (`permissions/index.tsx:70`, `settings.json:290`). It is **not** a privilege
escalation: the global `Permission.SEND_MESSAGES` still gates posting.

What remains, at MED: the API accepts and persists overrides it will never consult
(`channels.updatePermissions` blocks only DM channels, see 3.16), so the admin can save a
full override set on a public channel and the server stores write-only rows. Either
reject the write for non-private channels, or keep the rows and enforce them. A
per-channel mute is also impossible without making the channel private.

**2.2 — [FIXED] `send-message.ts:36` and `edit-message.ts:27` — message content had no
maximum length.** `content: z.string()` with no `.max()`, and no shared constant exists
(`grep MAX_MESSAGE` finds only `MAX_MESSAGE_FETCH_LIMIT` in `search.ts`). A single
mutation can persist a multi-megabyte HTML blob, which then gets sanitized (CPU),
metadata-parsed, stored, and re-sent in full to every client that opens the channel and to
every `joinMessagesWithRelations` page. The client's editor presumably caps it; nothing on
the server does.
Fixed: `MESSAGE_MAX_LENGTH = 10_000` in `packages/shared/src/statics/index.ts`, applied by
`.max()` on both routes and checked in the client's `handleSend` so the user is told
before losing what they typed rather than after (`messageTooLong`, added to all seven
locales). Three tests: over the limit rejected on send, exactly at the limit accepted,
over the limit rejected on edit. Closes the client half recorded as 10.1 as well.

Note while editing the locales: `bun run synci18n` reports `simulcastLayers` and
`simulcastLayer` missing from `sidebar.json` in every non-English locale. Pre-existing and
untouched by this change, but it is real translation debt.

**2.3 — [FIXED] `get-messages.ts:29` and `get-thread-messages.ts:16` — `limit` was
unvalidated, and a negative limit disabled the limit.** `limit: z.number().default(DEFAULT_MESSAGES_LIMIT)`
accepts any number, and both routes then call `.limit(limit + 1)`. SQLite treats a
negative LIMIT as *no limit*: `limit: -2` yields `LIMIT -1` and returns the entire channel
(or thread), which is then passed whole to `joinMessagesWithRelations` and serialized.
`limit: 1e9` does the same thing the honest way. Both routes are the cheapest possible
call for a client to make.
Fixed: `z.number().int().min(1).max(DEFAULT_MESSAGES_LIMIT).default(DEFAULT_MESSAGES_LIMIT)`
on both routes, so the ceiling is the existing constant rather than a second number. Four
tests: negative limit rejected on both routes, above-maximum rejected, non-integer
rejected, exactly at the maximum accepted.

**2.4 — [DEFERRED, constraint recorded] `get-messages.ts:95-99` — the jump-to-message
branch is unbounded by construction.** `newerMessages` selects every root message with
`createdAt >= target.createdAt`, no limit, deliberately. Linking to a message from a year
ago loads a year of history into memory, joins files/reactions/reply-previews for all of
it, and ships it in one response. This is a normal user action (clicking a search result
or a reply preview), not an attack.
**Why it is still here.** The obvious fix, a bounded window, cannot be done server side
alone without trading this performance problem for a correctness one. The client *merges*
jump results into the channel's existing list: `features/server/messages/hooks.ts:229`
calls `storeChannelMessages(..., { prepend: true })`, which dedupes and merges
chronologically and never replaces, and the channel already holds the newest page from
init. Returning everything from the target to now is what guarantees the merged list is
contiguous. Cap the newer side and a jump further back than the cap leaves a **hole** in
the middle of a rendered list with nothing telling the user, and there is no jump-to-present
affordance to recover with (`scrollToBottom` only moves the DOM).

The real fix is therefore: bounded contiguous window on the server, the client replacing
the channel list on jump instead of merging, and a path back to the present. That spans
this route, `features/server/messages` (chunk 8) and the scroll controller (10.3, which
has its own uncleaned-timer bug), so it belongs with those rather than here.

Until then this is a known scaling limit: jumping to an old message loads everything since
it. 2.3's ceiling does not apply to this branch.

**2.5 — [FIXED] `files/delete-file.ts:39-50` — the second message-deletion path skipped
all of the first one's cleanup.** When the last file of a file-only message is removed, the route
deletes the message with a bare `db.delete(messages)`. `messages/delete-message.ts:55-80`
does three more things for the same operation: nulls `replyToMessageId` on messages that
replied to it and republishes them, republishes the parent's reply count, and removes
attached files. So deleting a message *via its last file* leaves dangling
`replyToMessageId` pointers (the client renders a reply preview to a message that no
longer exists) and a stale thread reply count. Textbook near-duplicate drift: two copies,
one is wrong.
Fixed: `deleteMessage` in the new `db/mutations/messages.ts` is now the only way a message
is deleted, and both routes call it. It removes attached files (still needed by hand,
`files` has no foreign key back to the message), collects the messages that reference this
one *before* the delete, and then publishes the deletion, an update for each affected
reply, the parent's reply count and the `message:deleted` plugin event.

2.6 did most of the work: the database now nulls the reply pointers and cascades thread
replies, so the hand-written `UPDATE … SET replyToMessageId = NULL` is gone from
`delete-message.ts`. What was left was the event side, which is what clients actually
render. Two tests in `files.test.ts` assert the file path now performs the same cleanup as
`messages.delete`: inline reply pointers clear, and a thread parent's reply count updates.
`delete-message.ts` went from 88 to 48 lines, `delete-file.ts` from 54 to 48.

**2.6 — [FIXED] `db/schema.ts:270-271` — `parentMessageId` and `replyToMessageId` were
plain integers with no foreign key.** Only indexes, no `references()`, so the database enforces
nothing. Deleting a thread parent leaves its replies in the table forever: they are
excluded from `get-messages` (`isNull(parentMessageId)`) and unreachable from
`get-thread-messages` (parent is gone), so their rows, their `messageFiles` rows and their
files on disk leak permanently. `delete-message.ts` cleans up inline replies by hand but
never touches thread children. The same hole is wider on user deletion: `messages.userId`
is `onDelete: 'cascade'` (`schema.ts:263`), so deleting a user removes their messages
directly in SQLite, bypassing every cleanup path in the routes at once.
Fixed: both columns now carry self-referencing foreign keys,
`parentMessageId → messages.id ON DELETE CASCADE` and
`replyToMessageId → messages.id ON DELETE SET NULL`, in migration
`0018_message_parent_reply_foreign_keys.sql`.

Two things the migration had to handle:

- **Pre-existing violations.** Orphans exist precisely because the constraint was missing,
  and SQLite does not validate existing rows when a constraint is added, so they would
  have survived as permanently dangling references. The migration deletes orphaned thread
  replies and nulls dangling reply pointers before the table rebuild.
- **The comment trap.** The explanatory comment was first written as its own chunk above a
  `--> statement-breakpoint`, which made the whole suite fail with "Statement has
  finalized": a comment-only chunk has nothing for `prepare()` to compile. It is now
  attached to the statement it describes. This is the same class of trap as 5.16, from the
  other direction.

Three tests added to `cascade.test.ts` (thread replies cascade, inline reply pointers null
out, channel deletion takes thread replies with it). That file is organised by foreign key,
which is exactly why it had no case for these two before.

**2.7 — [FIXED, with 2.8] `send-message.ts:240-270` — the message row was committed before
its files existed, with no transaction.** Insert the message, then loop `fileManager.saveFile`, then
`publishMessage`. `saveFile` throws on quota exceeded, avatar/banner oversize, a
`beforeFileSave` plugin hook failing, or a missing temp file (TTL is 60s). When it does:
the message row is already persisted, no `publishMessage` ever fires, and the caller gets
an error. The sender sees a failure and a message that is in the database but on nobody's
screen until a reload.
Fixed: the files are saved first, then the message and all of its `messageFiles` rows are
inserted in one synchronous transaction (5.0), and only then is anything published. A
`saveFile` rejection now leaves no message behind at all, which a new test asserts by
sending with a temp file id that does not exist.

This also closed 2.8: the per-file `db.insert(messageFiles)` inside the loop became a
single batched insert inside the transaction, so the loop now only calls `saveFile`.

Files saved before a later failure are left unlinked for the orphan cleanup cron, by
decision. That is the same state a failed upload already produces, and worth reading
together with 7.2, which is a race in that cron.

### MED

**2.8 — [FIXED with 2.7] `send-message.ts:256-270` — file save and insert ran one row at a
time in a loop.** N sequential `saveFile` calls (each of which does its own settings read, quota
queries and md5) plus one `db.insert(messageFiles)` per file. AGENTS.md's "never query
inside a loop" applies to the insert at minimum: collect the rows and insert once.

**2.9 — [FIXED] `send-message.ts:111-114` — attachments over the limit were silently
dropped.**
`input.files.slice(0, max)` truncates instead of rejecting, so a client that attaches 11
files with a limit of 10 gets a message with 10, no error, and one orphaned temp file. The
`z.array(z.string())` also has no `.max()`, so the input itself is unbounded.
Fixed: the route now rejects with `BAD_REQUEST` naming the limit instead of trimming, and
the zod array carries `.max(STORAGE_MAX_FILES_PER_MESSAGE)` so the input itself is bounded.

Both tests that encoded the old behaviour were rewritten, as predicted: "should trim
attached files to configured max" became "should reject a message with more files than the
configured maximum", and "should discard all attached files when max is 0" became "should
reject any attachment when max files per message is 0". A third test was added for exactly
the maximum being accepted.

With 10.2's correction (the client already refuses extra files at attach time and says so),
this is defence in depth against a non-conforming client rather than a user-facing path.

**2.10 — [FIXED] `toggle-message-reaction.ts:23` — `emoji: z.string()` was unvalidated.** No
length bound, no check that it is an emoji or a known custom emoji name.
`getEmojiFileIdByEmojiName` returning null does not stop the insert, so any string of any
size becomes a reaction that every client in the channel renders.
Fixed: `.min(1).max(REACTION_EMOJI_MAX_LENGTH)` (32, matching the custom emoji name limit
and comfortably fitting any ZWJ sequence), plus a check that a value which is **not**
pictographic resolves to an existing custom emoji. `EMOJI_CHARACTER_REGEX`
(`/\p{Extended_Pictographic}/u`) in `packages/shared` is how a unicode emoji is told apart
from a custom name without an exhaustive table, which was the objection to the strict
allowlist option.

The check only applies when adding a reaction, so a reaction survives its custom emoji
being deleted and can still be toggled off; there is a test for exactly that, alongside
oversized input, an arbitrary string, and a four-person family emoji being accepted.

**2.11 — [FIXED, with 3.7] `get-messages.ts:155-194` — a `.query()` performed writes, and
they were the wrong writes.** Reading any page of a channel upserts `channelReadStates` to the channel's
*newest* message, not to what was read. Paging backwards through history marks the whole
channel read; opening a channel and immediately scrolling up does the same. The code says
"this is not ideal, but it's good enough for now". Beyond the UX bug, a query procedure
with side effects is a problem on its own: tRPC treats queries as safe to batch, cache and
retry.
Fixed: the write is gone from `get-messages`, which is now a pure query, and
`channels.markAsRead` is the single path. It gained the `onConflictDoUpdate` upsert that
`get-messages` had (closing 3.7's race, where two concurrent calls could both find no row
and race on the insert) and the `CHANNEL_READ_STATES_UPDATE` publish it was missing, so a
user's other sessions now drop the unread badge too. It also selects only `id` rather than
the whole newest message row.

The client already called `markChannelAsRead` on channel select, voice sidebar open,
jump-to-message and new-message arrival, so nothing depended on the query's side effect.
Two tests: fetching a page no longer marks a channel read, and two concurrent
`markAsRead` calls settle without conflicting.

**2.12 — `get-messages.ts:108` / `get-thread-messages.ts:60` — cursor pagination on a
non-unique column drops messages.** The cursor is `createdAt` (milliseconds) and the
predicate is a strict `lt` / `gt`. Two messages with the same `createdAt` straddling a
page boundary means the second one is never returned by any page. Bulk inserts, plugin
messages and fast typing all produce same-millisecond rows.
Fix: composite cursor `(createdAt, id)`, or paginate on `id` since it is monotonic here.

**2.13 — [PARTLY FIXED] the channel-access checks re-queried the same rows three to six
times per request.** `assertDmChannel` (`db/queries/dms.ts:150`) calls `isDirectMessageChannel`,
then `assertDmParticipant`, which calls `isDirectMessageChannel` **again**, then
`isUserDmParticipant`: three queries where two suffice, one of them duplicated outright.
`assertChannelAccess` then runs that alongside `needsChannelPermission`, and
`hasChannelPermission` (`utils/wss.ts:100`) itself does channel → dm participant → user →
roles → all channel permissions. `send-message.ts:103-107` adds its own
`isDirectMessageChannel` call next to `assertDmChannel`, which already did that query.
Nothing is memoized per request. A single `messages.send` runs well over a dozen queries
before it touches the message table.
Fixed, the duplicate queries only: `assertDmParticipant` had no callers outside its own
file and its `isDirectMessageChannel` call was the verbatim repeat, so it was folded into
`assertDmChannel`, which already knew the answer. `assertDmChannel` now returns whether the
channel was a DM, and `send-message` uses that instead of asking again. Two queries removed
from every message send; `isDirectMessageChannel` no longer appears in the route at all.

**Still open by decision:** `hasChannelPermission` re-reads the channel, the user and their
roles on every call, and routes call it two or three times per request with no
memoization. That is the same underlying problem as 5.4 (three divergent permission
resolvers) and 7.8, and is better fixed once those are unified than patched here.

**2.14 — [FIXED] `send-message.ts:200-206` — the command status update was published before
it was awaited.** `db.update(...).execute()` is not awaited, and `publishMessage` fires on the
next line. Clients can be told to refetch a message whose update has not been applied.
Same in the `.catch` branch.
Fixed: `updateCommandStatus` is now async, awaits the update and only then publishes, and
both the `.then` and `.catch` handlers return its promise so a failure surfaces rather
than becoming an unhandled rejection. `.execute()` is gone; the plain awaited builder does
the same thing.

**2.15 — [FIXED] `send-message.ts:146-152` — plugin commands were parsed from unsanitized
content.** `getPlainTextFromHtml(input.content)` runs on the raw input, and its output is
both the command parser's input and the `textContent` emitted on `message:created` to every
plugin. Sanitization happens separately into `targetContent`. So the command that executes
and the text plugins receive can differ from what is stored and displayed.
Fixed: `plainText` is derived from `targetContent` (post-sanitization) rather than
`input.content`, so the command that runs and the `textContent` handed to plugins are the
same text that gets stored and displayed. It is computed before the command branch
rewrites `targetContent`, so the ordering still works.

This is a semantic change, not a pure refactor: a command hidden in content that
sanitization strips no longer parses, which is the intent.

**2.16 — [FIXED, reframed] `delete-message.ts` — ordering, and an unbounded publish per
affected reply.** By the time this was fixed, 2.5 had moved the deletion into
`db/mutations/messages.ts` and 2.6's foreign keys had removed the manual
`replyToMessageId` nulling, so the original description no longer matched the code. What
was actually left:

- **Ordering, not transactionality.** Files were removed (database row *and* `fs.unlink`)
  before the message was deleted, so a failed delete left the files gone and the message
  showing broken attachments. A transaction cannot help here, `fs.unlink` is not
  rollback-able. Fixed by reversing the order: the message row goes first (cascading
  `messageFiles`), then the files. A failure now leaves orphans the cleanup cron reclaims,
  which is recoverable.
- **The unbounded publish loop is gone entirely.** Instead of publishing a full message
  update per reply (each one a `getMessage` join plus an affected-users lookup, so fifty
  replies cost fifty of them), the client's `deleteMessage` reducer now clears
  `replyToMessageId` and `replyTo` on any message referencing the deleted id, driven by the
  `MESSAGE_DELETE` event it already receives. Clients that never loaded those replies need
  nothing at all.

**2.17 — [PARTLY FIXED] routes that need a rate limiter and do not have one.**
`delete-message.ts`, `toggle-message-pin.ts`, `get-thread-messages.ts`, `get-pinned.ts`,
`get-message.ts`, `files/delete-file.ts`, `files/delete-temporary-file.ts`,
`dms/get-direct-messages.ts`. `get-thread-messages` is the notable one: it costs the same
as `get-messages`, which is limited (`config.rateLimiters.getMessages`), and it is
unbounded per 2.3.

Fixed for the three expensive ones, by decision, reusing existing limiter configs rather
than adding config surface: `messages.getThread` and `messages.getPinned` share
`rateLimiters.getMessages` (same joins, and `getPinned` still has no page size),
`messages.delete` shares `rateLimiters.sendAndEditMessage` (it cascades rows, unlinks
files from disk and publishes). One test walks `getThread` to a 429.

**Left unlimited by decision:** `messages.getOne`, `files.delete`,
`files.deleteTemporary` and `dms.get`, all cheap single-row operations.

### LOW

**2.18 — the same dead query in two files.** `get-pinned.ts:19-31` and
`get-thread-messages.ts:41-53` both select `channels.private` and then never read it;
`assertChannelAccess` above them already proved access, and a missing channel already
fails there. Two extra queries per request for nothing, copy-pasted.

**2.19 — `db.select()` where two to four columns are used.** `toggle-message-pin.ts:22`
and `toggle-message-reaction.ts:29` fetch the whole message row (including `content` and
`metadata`) to read `channelId`/`pinned`; `get-thread-messages.ts:24` fetches the whole
parent to read `parentMessageId` and `channelId`; `get-messages.ts:158` fetches the whole
latest message to read `id`. `send-message.ts` and `delete-message.ts` do this correctly,
so the pattern to copy is already in the folder.

**2.20 — `toggle-message-pin.ts:41-46` — unpinning writes pin metadata.** `pinnedAt: now`
and `pinnedBy: ctx.user.id` are set on both branches, so an unpinned message records who
unpinned it in the field meaning "who pinned it". Set them to `null` when unpinning.

**2.21 — `search.ts` nits.**

- line 156: `const messageFiles = ...` shadows the imported `messageFiles` table in the
  same file. It works today, and it is a trap for the next edit.
- lines 75, 96: `channelPrivate` is selected in both queries and never used.
- line 48: `invariant(settings.enableSearch, 'Search is disabled…')` uses the string
  overload, which produces `BAD_REQUEST`; every other settings gate in the codebase uses
  `{ code: 'FORBIDDEN' }`.
- lines 112-130: results are prefiltered by SQL `LIKE` to 100 rows, then filtered again in
  JS and cut to 25. A match ranked 101st by recency is invisible, and the count shown to
  the user is not the real count. The header comment acknowledges the design, it just is
  not acknowledged to the user.

**2.22 — `files/delete-temporary-file.ts:2-4` — `.js` import extensions.** The only file
in the server that writes `'../../utils/trpc.js'`. Every other file omits the extension.

**2.23 — the load-and-authorize preamble is written six times.** `edit-message.ts:31-62`,
`delete-message.ts:17-42`, `toggle-message-pin.ts:21-38`,
`toggle-message-reaction.ts:28-40`, `get-message.ts:14-21`, `files/delete-file.ts:19-33`
all do: select the message → `invariant(NOT_FOUND)` → `assertChannelAccess` → (four of
them) `userId === ctx.user.id || hasPermission(MANAGE_MESSAGES)`. The owner-or-manage
check in particular is four verbatim copies with four separately worded messages. Past the
two-copy rule.
Fix: one `loadMessageForWrite(ctx, messageId, { requireOwnerOr })` helper in `helpers/`.

**2.24 — `dms/open-direct-message.ts` nits.** Two users opening the same DM
simultaneously both miss the `getDirectMessageChannel` read and both insert; the unique
index (`direct_messages_pair_unique_idx`) turns the loser into an unhandled constraint
error rather than a returned channel id, so catch it and re-read. The channel name
`DM - ${a}:${b}` bakes user ids into a user-visible field, and `ChannelType.VOICE` is used
for text DMs with a comment explaining the future intent, which will be a confusing
default for anything that switches on channel type in the meantime.

**2.25 — `signal-typing.ts:21-31` — work runs alongside the permission checks.**
`getAffectedOnlineUserIdsForChannel` is in the same `Promise.all` as
`needsPermission` / `needsChannelPermission` / `assertDmChannel`, so the query runs for
callers who are about to be rejected. AGENTS.md's rule is that independent checks may
share a `Promise.all`, not that work may share it with the checks. Also
`const [, , , affectedUserIds]` is three holes deep.

**2.26 — `edit-message.ts:79-84,93` — `updatedAt` and `editedAt` are two `Date.now()`
calls for the same edit (they can differ by a millisecond, and it is not clear what the
two columns mean separately); `message:updated` reports `userId: message.userId`, the
original author, while `editedBy` records the actual editor, so plugins cannot tell who
edited.

**2.27 — `files/delete-file.ts:22` — "Message not found" for a file that exists.**
Deleting an avatar, banner or emoji file id through this route reports that a *message* is
missing. Correct in effect (only message files are deletable here), misleading as a
user-facing string.

### Missing tests

`routers/__tests__/messages.test.ts` is 74 tests and covers permissions, DM gating,
threads, inline replies, pagination and search leakage well. The gaps line up exactly with
the findings above:

- no test for message content length (2.2) because no limit exists.
- no test for `limit: -2` or a huge `limit` on `messages.get` / `messages.getThread`
  (2.3), nor for the size of the `targetMessageId` response (2.4).
- no test that deleting a message's last file cleans up inline replies and thread replies
  the way `messages.delete` does (2.5) — this one is a real bug with no coverage on either
  side.
- no test that deleting a thread parent removes or reassigns its replies (2.6).
- no test that a failing `saveFile` does not leave a message row behind (2.7).
- no test for two messages with an identical `createdAt` across a page boundary (2.12).
- no test for an oversized or non-emoji reaction string (2.10).
- `messages.test.ts:1046` asserts the silent file truncation (2.9); it encodes the bug.
- nothing covers `signal-typing`'s recipient list (only that it does not throw), so the
  `VIEW_CHANNEL` filter in `getAffectedOnlineUserIdsForChannel` is unverified.
- `dms.test.ts` has no test for concurrent `dms.open` on the same pair (2.24).

## 3. Routers: users & access

Scope: `routers/users/**` (17 files), `routers/roles/**`, `routers/invites/**`,
`routers/categories/**`, `routers/channels/**`. 44 files, ~2200 lines.

Every route in this chunk starts with the right global permission check, and the
`events.ts` subscription files are uniform and correct. The findings are about what
happens *after* the permission passes: there is no privilege hierarchy between
administrators, three routes trust `.returning().get()` on rows that may not exist, and
several destructive paths are not transactional.

### CRIT

**3.1 — [FIXED] `users/ban.ts`, `users/kick.ts`, `users/delete-user.ts`,
`users/add-role.ts`, `users/remove-role.ts` — `MANAGE_USERS` can be used against the
owner and against every other administrator.** The only target restrictions in the whole
folder are "not yourself" (`ban.ts:21`, `delete-user.ts:67`, absent from `kick.ts` and
`unban.ts`), "not the deleted-user placeholder" (`delete-user.ts:88`), and
`assertCanModifyOwnerRole`, which guards *the owner role as a grant target* and nothing
else. There is no check comparing the actor's privilege against the target's. So a
moderator holding only `MANAGE_USERS`:

- can ban the owner (`users.ban`), disconnecting them and blocking reconnection at
  `wss.ts:69`;
- can delete the owner (`users.delete`), and with `wipe: true` the deletion cascades
  through `messages`, `emojis`, `messageReactions` and `files`, destroying everything
  that user ever posted, irreversibly;
- can strip roles from any admin (`users.removeRole` only refuses `OWNER_ROLE_ID`).

`assertCanModifyOwnerRole` shows the intent was to protect ownership, but it only covers
one of five routes that can act on an owner. The server can be taken over, or gutted, by
anyone the owner trusts with user moderation.
Fix: one `assertCanActOnUser(actorId, targetId)` helper used by all five routes: refuse
when the target holds `OWNER_ROLE_ID` and the actor does not, and refuse when the target's
effective permission set is not a subset of the actor's.

Fixed with the owner half only, by decision: `helpers/assert-can-act-on-user.ts` refuses
when the target holds `OWNER_ROLE_ID` and the actor does not, and is called by all five
routes. It reads the target's roles first and returns before touching the actor's, so the
common case costs one extra query. The subset half was **not** implemented: two
`MANAGE_USERS` holders can still ban, kick and delete each other, and `MANAGE_USERS` can
still strip roles from a non-owner admin. That is the accepted behaviour, not an oversight.

`seed.ts` gained a Moderator role (id 4, `MANAGE_USERS` only) and a Test Moderator user
(id 5) holding it, appended after the existing rows so no id shifted; `setup.test.ts`
counts updated to 5 users and 4 roles. Six tests added in `users.test.ts`: moderator
cannot ban, kick, delete or re-role the owner (each asserting the target survived),
moderator can still ban a regular user, and an owner can act on a second owner-role
holder. The four rejection tests were run against a no-op version of the helper first and
all four failed, so they observe the guard rather than the message.

### HIGH

**3.2 — [FIXED] `users/delete-user.ts:115-118` — deleting a second user who shared a reaction
fails, permanently.** The non-wipe branch reassigns `messageReactions.userId` to the
placeholder, but that table's primary key is `(messageId, userId, emoji)`
(`schema.ts:369`). If the placeholder already holds 👍 on message 42 (because a previously
deleted user reacted with it), reassigning a second user's 👍 on message 42 violates the
primary key, the whole transaction rolls back, and `users.delete` fails with a raw
constraint error. The account becomes undeletable through the UI, and the admin has no
way to know why. Reproducing it takes two users, one message and one emoji.
Fix: delete the conflicting reactions instead of reassigning them
(`insert … onConflictDoNothing` then delete the remainder), and do the same audit for
every other reassigned table.

Fixed: the non-wipe branch now deletes the target's colliding reactions before the
`UPDATE`, in the same transaction, using a correlated `exists` against an alias of the
same table (same `messageId` + `emoji` already held by the placeholder). The two reactions
collapse into the one row the placeholder can hold. The audit of the other three
reassigned tables found nothing: `messages` and `files` are keyed on `id`, and `emojis` is
unique on `name`, not on `userId`. One test added, verified failing with the delete
statement removed.

**3.3 — [FIXED] `roles/update-role.ts:25,49` — `MANAGE_ROLES` is owner-equivalent.**
`permissions: z.enum(Permission).array()` is written to the role verbatim by
`syncRolePermissions`, with no check that the actor already holds the permissions being
granted. A user with only `MANAGE_ROLES` grants themselves `MANAGE_USERS`,
`VIEW_USER_SENSITIVE_DATA`, `MANAGE_CHANNEL_PERMISSIONS`, everything except the owner
role, in one call. `users/add-role.ts` is the second path to the same place: `MANAGE_USERS`
assigns any existing non-owner role, so if any role in the server is over-privileged, it
can be self-assigned.
Whether this is acceptable is a product decision (Discord blocks granting permissions you
do not hold), but right now `MANAGE_ROLES` and `MANAGE_USERS` are both, in practice,
"administrator", and the permission list implies otherwise.
Fix: reject permissions the actor does not hold, in `update-role` and `add-role` alike;
combine with 3.1's `assertCanActOnUser`.

Fixed, blocking newly granted permissions only. `update-role` loads the role, diffs the
submitted list against what the role already holds, and rejects when the actor lacks any
of the **added** permissions, so a non-owner `MANAGE_ROLES` holder can still rename or
recolor a higher role, and can still remove permissions from it, but cannot escalate.
`add-role` rejects when the role's permission set is not a subset of the actor's.
`ctx.hasPermission` already takes an array and short-circuits for the owner, so no new
permission machinery was needed; `hasPermission([])` is `true`, which is what makes the
no-op edit pass.

`assertCanModifyOwnerRole` moved above the new subset check in `add-role`: the owner role
holds every permission, so it fails the generic rule too, and the caller was getting the
vague message instead of the one naming ownership.

This also closes the `update-role` half of **3.6** (the route now loads the role and
returns `NOT_FOUND` before touching it, instead of dereferencing an `undefined` from
`.returning().get()`). `channels/update-channel.ts` is still open.

The seeded Moderator role gained `MANAGE_ROLES` alongside `MANAGE_USERS`. Five tests
added: cannot grant a permission they lack (asserting the role's permissions did not
change), *can* rename a role holding a permission they lack, cannot assign an
over-privileged role (asserting nothing was written to `userRoles`), and `NOT_FOUND` for a
nonexistent role in both routes.

**3.4 — [FIXED] `categories/delete-category.ts:28-30` — deleting a category takes its channels
down through a path that skips every cleanup.** `channels.categoryId` is
`onDelete: 'cascade'` (`schema.ts:161`), so the channels are already gone by the time the
route runs its own `db.delete(channels)`; that statement matches nothing and is dead code
(AGENTS.md: let the database cascade). The consequence is that the cascade bypasses
everything `channels/delete-channel.ts:40-46` does for the same event:

- `VoiceRuntime.findById(id).destroy()` never runs, so every voice channel in the category
  leaks its mediasoup router and transports for the lifetime of the process;
- `publishChannel(id, 'delete')` never fires, so clients keep rendering channels that no
  longer exist until a reload;
- the activity log records one category deletion and no channel deletions.

Fix: load the category's channels first and route them through the same deletion path
`channels.delete` uses, then delete the category, all in one transaction.

Fixed: the route now selects the category's channel ids **before** the delete (after the
cascade there is nothing left to read), and once the category is gone loops over them
destroying the voice runtime and publishing `channel delete` for each. The dead
`db.delete(channels)` is removed. No transaction was needed in the end: with the cascade
doing the work there is a single write. The `DELETED_CATEGORY` log entry now carries
`channelIds`, which meant widening that entry's `details` type in
`packages/shared/src/logs.ts`; nothing in the client renders it.

The two cleanup lines are duplicated from `channels/delete-channel.ts` by decision, rather
than extracted into a two-line helper for two call sites.

One test added, and it establishes a pattern the suite did not have: nothing anywhere
asserted a published event. It subscribes with `pubsub.subscribeFor(1, CHANNEL_DELETE)`,
deletes the category, waits a tick (`publishChannel` resolves its recipient list
asynchronously and no route awaits it), and asserts the announced ids match the channels
that were in the category. Verified failing with the loop removed. The runtime-destroy half
is not asserted: mediasoup runtimes cannot be created in the harness, so `findById` returns
undefined there.

**3.5 — [FIXED, with 3.18 and 3.19] `users/change-avatar.ts:34-63` and `users/change-banner.ts:102-129` — the old
image is destroyed before the new one is saved.** `removeFile(user.avatarId)` and the
`avatarId: null` update run first; `fileManager.saveFile` runs second and throws on
quota exceeded, on `validateFinalFileSize` (both routes pass `FileSaveType.AVATAR` /
`BANNER`, which have their own size limits), on a failing `beforeFileSave` plugin hook, or
on an expired temp file (60s TTL). The user is then left with no avatar at all and an
error toast. The existing test "should replace existing avatar" only covers the success
path.
Fix: save the new file first, swap the column, then remove the old file.

Fixed as one edit covering all three findings in these files. `helpers/change-user-image.ts`
now holds the whole operation, parameterised by `'avatar' | 'banner'`, and both routes are
four lines calling it, keeping their existing tRPC names so no client change was needed.
The order is now: validate mime, load the user, save the new file, point the column at it,
then remove the old file. `avatarId`/`bannerId` are `onDelete: 'set null'`, so removing the
old row after the column has moved cannot null out the new value. 3.18 (the duplicated
file) and 3.19 (`throw new Error` for a validation message, now a `BAD_REQUEST` invariant)
are closed by the same change.

One test added: set an avatar, lower `storageMaxAvatarSize`, then attempt a larger one, and
assert both the column and the file row still point at the original. Verified failing
against the old ordering.

### MED

**3.6 — [FIXED] `roles/update-role.ts:36-48` and `channels/update-channel.ts:37-49` — a
nonexistent id crashes the process handler instead of returning `NOT_FOUND`.** Both do
`db.update(...).returning().get()` and then dereference the result
(`updatedRole.id`, `updatedChannel.private`). For an id that does not exist, `.get()`
returns `undefined` and the route throws a `TypeError`, surfacing as
`INTERNAL_SERVER_ERROR`. Every sibling route (`update-category`, `delete-role`,
`delete-channel`, `delete-invite`) checks first. Two copies of the same omission.

**3.7 — [FIXED with 2.11, test added with chunk 3] `channels/mark-as-read.ts:42-73` — the read-state upsert was
hand-rolled here and correct elsewhere.** This route does select → branch → update-or-insert, which races (two
concurrent calls both see no row, both insert, one hits the primary key) and is three
statements. `get-messages.ts:169` performs the identical operation with a single
`onConflictDoUpdate`. It also does **not** publish `CHANNEL_READ_STATES_UPDATE`, which
`get-messages.ts:190` does publish, so marking a channel read does not update the user's
other connected clients. Two implementations of one operation; the older one is wrong on
both counts.
Fix: one `markChannelRead(userId, channelId)` in `db/mutations/`, called by both. Ties
into 2.11.

**3.8 — [PARTLY FIXED] unbounded reads across the admin surface.** `users/get-users.ts` returns every
user with avatars and banners joined; `users/get-user-info.ts:33` calls
`getNonDirectMessagesFromUserId` and `getFilesByUserId` with no limit, so opening one
user's info panel loads every message they have ever sent into a single response;
`invites/get-invites.ts` and `roles/get-roles.ts` are also unpaginated. AGENTS.md requires
pagination on anything unbounded. `get-user-info` is the urgent one: it grows without
limit for the most active users on the server.

Fixed for `get-user-info` only: `getFilesByUserId` and `getNonDirectMessagesFromUserId`
now take a limit, are ordered newest first, and the route passes 100. The panel shows a
recent history rather than an archive, and the storage totals it displays come from
`getStorageUsageByUserId`, which is a separate aggregate and is unaffected by the cap.
`users.getAll`, `invites.getAll` and `roles.getAll` are left unpaginated: they are bounded
by the size of the server rather than by activity, and paginating them means changing the
admin UI too.

**3.9 — [FIXED] `channels/reorder-channels.ts:44-57` and `categories/reorder-categories.ts:45-58`
are the same forty lines twice, and both do a write per row in a loop.** Same algorithm,
same `!nextVisibleIds.includes(...)` inside a loop over the input (O(n²) both times), same
per-row `tx.update` (AGENTS.md: never query inside a loop), same unbounded
`z.array(z.number())` input, and the same meaningless activity-log payload
(`channelId: nextChannelOrder[0]`, `position: length`). `reorder-categories.ts:10` carries
a TODO admitting the design is bad.
Fix: one `reorderPositions(table, ids)` helper doing a single `UPDATE … SET position =
CASE id WHEN … END`, bounds on the input array, and a log entry that records the order.

Fixed as described. `db/mutations/positions.ts` holds `reorderPositions(table, existingIds,
requestedIds)`, which merges the requested order with the rows that were not sent (Sets
instead of the O(n^2) `includes`) and writes one `UPDATE ... SET position = CASE id WHEN ...
END`. Both routes now share it and the TODO is gone. Inputs are capped at 500 ids. The
activity log gained `REORDERED_CHANNELS` and `REORDERED_CATEGORIES`, recording the
resulting order instead of the meaningless `channelId: order[0], position: length`; nothing
on the client reads activity log entries, so the two new types cost only their `details`
declarations in shared.

**3.10 — [FIXED] `channels/add-channel.ts:51-55` — the voice runtime is created after the
transaction, unguarded.** If `runtime.init()` throws (mediasoup worker exhausted, port
range full), the channel row is already committed and the channel exists with no runtime,
so nobody can join it and nothing retries. There is also no existence check on
`categoryId`, so a bad id produces a foreign-key error rather than `NOT_FOUND`.

Fixed both halves: the category is loaded and asserted before the insert, and a failing
`runtime.init()` now deletes the committed channel row and rethrows, so the failure mode is
"the channel was not created" rather than "the channel exists and nobody can join it".

**3.11 — [FIXED] `roles/delete-role.ts:37-38` — two destructive statements, no transaction.**
`fallbackUsersToDefaultRole(role.id)` then `db.delete(roles)`. A failure between them
leaves every member of that role reassigned to default while the role still exists.
`set-default-role.ts:37` in the same folder does use a transaction.

Fixed: `deleteRoleAndFallbackUsers(roleId, defaultRoleId)` in `db/mutations/roles.ts` does
the reassignment and the delete in one synchronous transaction. The default role is read
before it opens, since the callback cannot await. `db/mutations/users.ts` held only the old
`fallbackUsersToDefaultRole` and had a single caller, so it is gone.

**3.12 — [FIXED] `roles/add-role.ts` — no input, no rate limit, no bound.** A `MANAGE_ROLES`
holder can create unlimited "New Role" rows; every role is then loaded by `getUserRoles`
on every permission check for every member who holds it, and by `roles.getAll` for the
admin UI.

Fixed: the route is now wrapped in `rateLimitedProcedure` and refuses past 250 roles. A new
`config.rateLimiters.adminCreate` (60/min) covers this and `invites.add`; it is set high
enough that the existing tests, which create ~33 roles and invites in one run against the
same limiter key, still pass, while still bounding abuse.

**3.13 — [PARTLY FIXED] `users/ban.ts` and `users/unban.ts` — no existence check, and the ban does not
revoke the token.** Both issue an `UPDATE` against an arbitrary id: banning user 99999
succeeds silently and writes an activity-log entry for a user that does not exist.
`unban.ts` has no self-check either. More importantly, banning closes the socket and
`wss.ts:69` blocks reconnection, but the JWT stays valid and `getUserByToken` does not
check `banned` (chunk 1, finding 1.4), so a banned user retains `/upload` access for up to
seven days.

Fixed the existence half: both routes load the target and return `NOT_FOUND` first, and
`unban` gained the self-check `ban` already had. The token half is **not** fixed here, it is
the same revocation problem as 1.17 and 3.15 and needs one mechanism for all three.

**3.14 — `users/kick.ts` — kick is cosmetic.** It closes the WebSocket and nothing else.
The token remains valid, so a client reconnects immediately. If that is the intent
(a "nudge"), the name and the activity-log entry oversell it; if not, it needs a
short-lived rejoin block.

**3.15 — [PARTLY FIXED] `users/update-password.ts` — no rate limit, and other sessions survive.**
An auth endpoint that verifies a password with argon2 on every call, with no
`rateLimitedProcedure` (AGENTS.md step 2 names auth explicitly), and changing the password
does not invalidate tokens issued earlier, so a stolen token outlives the password change
by up to seven days. See 1.17 for the fix.

Fixed the rate limit half: `config.rateLimiters.updatePassword` at 5/min. Token
invalidation is still open and still belongs with 1.17.

**3.16 — [PARTLY FIXED] `channels/update-permission.ts:62-70,81-89` — the whole permission matrix is
written for every save.** Each call deletes and reinserts one row per `ChannelPermission`
per target, with `allow: false` for everything not granted, rather than storing only the
overrides that differ. The table grows as (channels x targets x permissions), and the
`isCreate` flag exists only to write an all-false set. It also accepts non-private
channels, whose rows will never be read (see the corrected 2.1), and validates neither
`channelId`, `userId` nor `roleId` existence.

Fixed: the route now validates that the channel exists and that the target user or role
exists, in one `Promise.all`, before writing anything. **Not fixed:** the write
amplification. Storing only the overrides that differ is a storage-shape change with a
migration and a matching read-path change in `channelUserCan`, and it needs a decision on
what an absent row means before it can be written. Left open deliberately, with the
`isCreate` flag and the all-false set still in place.

### LOW

**3.17 — [FIXED] `routers/users/get-user-roles.ts` is not a route.** It is a database query, it is
not exported from `users/index.ts`, and its only consumers are `utils/wss.ts:79,131`. So
the WebSocket infrastructure imports from a routers folder to build the permission
context. It belongs in `db/queries/roles.ts` next to `getUserRoleIds`, which it partly
duplicates.

Fixed: moved verbatim into `db/queries/roles.ts` and the file deleted. It had exactly one
importer. The partial duplication with `getUserRoleIds` is left as is, they return different
shapes and both have callers.

**3.18 — [FIXED with 3.5] `users/change-avatar.ts` and `users/change-banner.ts` are the same 68-line file
twice.** They differ in `avatarId` vs `bannerId` and `FileSaveType.AVATAR` vs `BANNER`,
and they have already drifted: the avatar route calls `.run()` on both updates, the banner
route calls it on neither. This is exactly the copy-paste AGENTS.md forbids, and 3.5 is a
bug that now has to be fixed in two places.
Fix: one route parameterised by target, or one shared helper.

**3.19 — [FIXED with 3.5] `throw new Error('Invalid file type. Please try again.')` in both image
routes** (`change-avatar.ts:26`, `change-banner.ts:94`) instead of `invariant`, so a
user-facing validation message is delivered as `INTERNAL_SERVER_ERROR`.

**3.20 — [FIXED] `roles/update-role.ts:24` inlines a regex that exists in shared.**
`/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/` is character-for-character `HEX_COLOR_REGEX`
(`packages/shared/src/types.ts:189`), which `users/update-user.ts:22` imports correctly.

Fixed: imports the shared constant.

**3.21 — [FIXED] `channels/get-permissions.ts:19` is a `.mutation()` that only reads.** It takes a
channel id and returns two selects. It should be a `.query()`; as a mutation it cannot be
cached or prefetched by the client and it reads as a write at every call site.

Fixed: now a `.query()`, and its single client call site in
`features/server/admin/hooks.ts` switched from `.mutate` to `.query`.

**3.22 — [FIXED with 3.4] `categories/delete-category.ts:26` uses the string overload of `invariant`,**
producing `BAD_REQUEST` where every sibling route produces `NOT_FOUND`. Same issue as
2.21 in `search.ts`.

**3.23 — [FIXED] `invites/add-invite.ts` nits.** `code: z.string().min(4).max(64)` has no charset
restriction, and the code goes into an invite URL, so slashes, spaces and control
characters are accepted; `expiresAt: z.number()` is not required to be in the future, so
an already-expired invite can be created; the check-then-insert on `code` races into a
unique-constraint 500; there is no rate limit on invite creation; and `maxUses` of `0` is
silently converted to `null` meaning unlimited, which is the opposite of what `min(0)`
suggests to a caller.

Fixed: `code` is bounded by a new shared `INVITE_CODE_REGEX` (`[A-Za-z0-9_-]`, matching what
`getRandomString` already produces), `expiresAt` must be in the future, the
check-then-insert is replaced by `onConflictDoNothing().returning().get()` plus a `CONFLICT`
invariant so the race lands on the constraint instead of a 500, and the route is rate
limited with `adminCreate`. The `maxUses: 0` meaning unlimited is **kept** and documented in
a comment rather than changed, since the client relies on it.

**3.24 — [FIXED] `users/update-user.ts:15-21` — `name` is not trimmed.** `min(1)` accepts a single
space, and leading/trailing whitespace is stored as typed.

Fixed: `.trim()` before `.min(1)`, so a whitespace-only name is now rejected rather than
stored.

**3.25 — [FIXED] `db.select()` for existence checks and single columns.** `add-invite.ts:23,37`
(two full-row selects to check existence), `update-category.ts:21`, `add-channel.ts:23`
(full channel row to read `position`), `mark-as-read.ts:26` (full message row, `content`
included, to read `id` — the same waste as `get-messages.ts:158`).

Fixed: every listed select now names its columns. `mark-as-read.ts` was already narrowed
when 2.11 rewrote it, and `add-invite.ts`'s second full-row select disappeared entirely with
3.23's `onConflictDoNothing`.

**3.26 — [FIXED with 3.6] `channels/update-channel.ts` with no optional field set** produces
`db.update().set({})`, which drizzle rejects at runtime: a 500 for an empty update.

**3.27 — [FIXED] `users/update-password.ts:51` hashes `input.confirmNewPassword`** rather than
`input.newPassword`. They are equal by that line, so it is not a bug, but it is the wrong
variable to read at the one line where it matters. There is also no check that the new
password differs from the old one.

Fixed: hashes `input.newPassword`, and rejects a new password equal to the current one.

### Missing tests

Coverage is good on the "lacks permission" axis (every route has one) and on validation of
lengths and colors. The gaps are the findings above, and they are all reachable in the
existing harness with users 1 and 2:

- ~~nothing asserts that a `MANAGE_USERS` holder **cannot** ban, kick or delete the owner
  (3.1). The existing owner-role tests cover `addRole`/`removeRole` only.~~ added with 3.1.
- ~~no test deletes two users who reacted with the same emoji to the same message (3.2).
  This is the one to write first; it fails today.~~ added with 3.2.
- ~~no test that a `MANAGE_ROLES` holder cannot grant permissions they lack (3.3).~~ added
  with 3.3.
- ~~`categories.test.ts:140` asserts the category is deleted but not that its channels are
  gone, nor that their voice runtimes were destroyed (3.4).~~ channels covered with 3.4;
  runtimes remain unreachable in the harness.
- ~~no test that a failed avatar save leaves the previous avatar in place (3.5).~~ added
  with 3.5.
- ~~no test for `roles.update` / `channels.update` against a nonexistent id (3.6); the
  delete and get equivalents are covered.~~ added with 3.3 and 3.6.
- ~~no test that `channels.markAsRead` publishes a read-state event (3.7)~~ added; the
  concurrent-call case was already covered by an existing test.
- no test that `channels.updatePermissions` rejects (or is meaningless on) a public
  channel (3.16 / 2.1). Still open: the route now validates that the channel, user and role
  exist (covered), but whether a public channel should be refused outright is part of the
  3.16 storage decision that was left open.

## 4. Routers: voice & plugins

Scope: `routers/voice/**` (14 files), `routers/plugins/**`, `routers/emojis/**`,
`routers/others/**`, `runtimes/**` (`voice.ts` is 1028 lines, the largest file in the
server). The plugin *subsystem* under `src/plugins/` is chunk 6; this pass covers the
routes that call into it.

Two of the findings below are live bugs that fire on ordinary admin use, not on crafted
input. The voice runtime findings are all the same shape: mediasoup objects are replaced
in a map without being closed.

### CRIT

**4.1 — [NOT A FINDING, by your decision] `others/change-logo.ts` — the route has no permission check at all.**
There is no `ctx.needsPermission` anywhere in the file (`grep -c needsPermission
others/change-logo.ts` → 0, while every other settings route has one). Any authenticated
user can call `others.changeLogo` and:

- `removeFile(settings.logoId)` (line 27), destroying the server's current logo file
  outright, and
- set the server logo to any image they have uploaded (line 38), which is then served to
  every visitor through `/manifest.json`, the login screen and the server list.

The logo is also the single file exempted from signed URLs (`http/public.ts:91`), so it is
the one upload every unauthenticated visitor is guaranteed to fetch. `others.test.ts:221`
tests that the logo changes; nothing tests who may change it.
Fix: `await ctx.needsPermission(Permission.MANAGE_SETTINGS);` as the first line.

**Dismissed.** `MANAGE_SETTINGS` is the permission for server settings, and changing the
logo is not treated as one: any user may change it, by design. The permission check was
applied and then reverted, the route is back to its committed state and no test was added.
Recorded here so it is not re-raised. Note for whoever reads this later: the route writes
`settings.logoId`, which is the server-wide logo served on the login screen, in
`/manifest.json` and in the server list, so "any user may change it" is a server-wide
effect, not a per-user one. 4.17 (the delete-before-save ordering in the same file, which
lets a failing `saveFile` leave the server with no logo) is unaffected by this and is still
open.

**4.2 — [FIXED] `others/update-settings.ts:21` — saving any settings page silently deletes the
server join password.** The field is
`password: z.string().min(1).max(32).optional().nullable().default(null)`. Unlike every
other field, which is plain `.optional()` and therefore `undefined` (and skipped by
drizzle's `.set()`), an omitted `password` becomes **`null`**, and
`updateSettings` (`db/mutations/server.ts:6`) writes nulls. Both client call sites omit
it:

- `admin/hooks.ts:481` (storage settings form) does not send `password` at all;
- `admin/hooks.ts:89` (general settings form) sends `settings.password || undefined`, and
  the form is populated from `others.getSettings`, which strips `password`
  (`others/get-settings.ts:11`), so the field is always empty on load.

So an admin who opens the storage page and clicks save removes the server's join password,
with no warning and no way to notice: `get-settings` will not show them the field is now
empty either. The server silently becomes joinable without a password.
Fix: drop `.default(null)` and treat `undefined` as "leave unchanged"; use an explicit
`removePassword: z.boolean()` if clearing needs to be possible.

Fixed server-side only, by decision: `.default(null)` is gone and `.nullable()` stays, so
`undefined` leaves the password alone and an explicit `null` still clears it. The client was
left untouched, which means **clearing the password through the UI is still not possible** —
the general form sends `settings.password || undefined`, so an emptied field was already a
no-op before this change. That gap is unchanged, not introduced here, and needs its own task.

Collapsing the relist (4.19) exposed an edge the `.default(null)` had been masking: with
every field optional, an empty input now reaches `.set({})`, which drizzle rejects at
runtime. Guarded with the same `Nothing to update.` invariant used in 3.26.

Three tests added, all three verified failing against the original route: saving an
unrelated settings page keeps the join password, keeps plugins loaded (asserted by counting
calls to a stubbed `unloadPlugins`), and the activity log does not contain the password.

### HIGH

**4.3 — [FIXED] `others/update-settings.ts:81-87` — the same save unloads every plugin.**
`if (oldEnablePlugins !== input.enablePlugins)` compares a stored boolean against an input
that is `undefined` whenever the caller is not editing that field. `true !== undefined` is
true, so the branch runs, `input.enablePlugins` is falsy, and
`pluginManager.unloadPlugins()` executes. The storage settings form (which never sends
`enablePlugins`) therefore unloads all plugins on every save, while `settings.enablePlugins`
stays `true` in the database, so nothing reloads them until the server restarts and the
admin panel keeps reporting plugins as enabled.
Fix: `if (input.enablePlugins !== undefined && input.enablePlugins !== oldEnablePlugins)`.

Fixed exactly as described, together with 4.2.

**4.4 — [FIXED] `runtimes/voice.ts:607,688,515,553` — mediasoup objects are replaced without being
closed, from routes that have no rate limit.** Four sites, one pattern:

- `addProducer` (line 607) assigns `this.videoProducers[userId] = producer` (and the three
  other kinds) over whatever was there. The previous `Producer` is still open in
  mediasoup, no longer referenced by any map, and therefore not closed by `destroy()`,
  which iterates the maps.
- `addConsumer` (line 688) does the same to `this.consumers[userId][streamKey]`.
- `createConsumerTransport` (line 515) and `createProducerTransport` (line 553) assign
  `this.consumerTransports[userId] = transport` over an existing transport without closing
  it, leaking ICE/DTLS state and ports. Worse, the *old* transport's
  `observer.on('close')` handler runs `delete this.consumerTransports[userId]`, which
  deletes the **current** transport's entry when the orphan eventually dies, so the user's
  live transport becomes unreachable through `getConsumerTransport`.

None of `voice.produce`, `voice.consume`, `voice.createConsumerTransport` or
`voice.createProducerTransport` is wrapped in `rateLimitedProcedure`, so one user in one
voice channel can loop any of them and grow the SFU's memory, CPU and port usage without
bound. `config.rateLimiters` has `joinVoiceChannel` but nothing for the transport
lifecycle.
Fix: close the existing object before replacing it in all four setters, key the close
handler on the transport identity rather than the user id, and rate limit the four routes.

Fixed as described, all three parts:

- `addProducer` calls `removeProducer(userId, type)` first, which already closes, deletes
  and clears the quality layers. `addConsumer` closes the entry at the same stream key.
  Both close **before** the assignment, which matters: closing afterwards would fire the
  old object's close handler against the map entry the new object now occupies.
- the consumer and both transport close handlers now return early unless the map still
  holds the object being closed, so an orphan dying later cannot evict its replacement or,
  for the producer transport, close the producers belonging to the transport that replaced
  it.
- the new transport is created before the old one is closed, so a failure building it
  leaves the working transport in place (same ordering rule as 3.5).
- `config.rateLimiters.voiceTransport` (30/min) covers `createConsumerTransport` and
  `createProducerTransport`; `voiceStream` (200/min) covers `produce` and `consume`, which
  are legitimately noisy since `consume` fires once per remote stream.

`runtimes/__tests__/voice-runtime.test.ts` is new: four unit tests driving the maps with
stub producers and consumers, three of which fail against the original code. The file
carries the comment AGENTS.md requires, naming what is not covered (the transport paths,
because they build a real `WebRtcTransport` before touching the map) and why.

**4.5 — [PARTLY FIXED, and partly CORRECTED] `others/use-secret-token.ts` — the owner-granting route has no rate limit, no
single use, and no audit trail.** It compares `sha256(input.token)` against
`settings.secretToken` with `===` (not `helpers/safe-compare`, which `http/login.ts:254`
uses for exactly this), then inserts `OWNER_ROLE_ID` for the caller. Specifically:

- no `rateLimitedProcedure`, on the single highest-value endpoint in the application.
  AGENTS.md step 2 names "anything touching auth";
- the token is never invalidated after use, so anyone who ever sees it (first-boot console
  output, a screenshot, a support thread) can claim ownership later, repeatedly;
- no check that the caller already holds the role, so a second call violates the
  `userRoles` primary key and returns a raw 500;
- **no `enqueueActivityLog`**, while creating an emoji and toggling a pin both log. Gaining
  ownership of the server is the one action with no audit record.

The token itself is `sha256(randomUUIDv7())` in production (`db/seed.ts:47`), so guessing
is not the risk; the missing rate limit, reuse and audit gap are.

**Correction to this finding: the token cannot be invalidated after use.**
`settings.secretToken` is not only the owner-claim credential, it is the server's signing
key: `getServerToken()` returns it and `http/login.ts:287` signs every JWT with it, while
`helpers/files-crypto.ts` uses it as the HMAC key for signed file URLs. Clearing it on use
would invalidate every session and every signed URL, and `getServerToken` would then throw
`Secret token not found in database settings`. The "single use" half of this finding is
therefore **not implementable as written**, and that is the more interesting problem: one
value is doing duty as both a bearer credential shown to the operator and the server's
signing secret. See F6.

Fixed, the three parts that are safe today:

- rate limited with a new `config.rateLimiters.useSecretToken` (5/min);
- compared with `safeCompare` instead of `===`, and guarded against a null `secretToken`;
- an already-owner check returning `CONFLICT`, so a second call no longer violates the
  `userRoles` primary key and returns a raw 500;
- a new `USER_CLAIMED_OWNERSHIP` activity log entry, so gaining ownership is no longer the
  one unlogged action.

Three tests added: the second claim is rejected, the claim is logged, and repeated invalid
attempts are rate limited.

### MED

**4.6 — [FIXED] `others/join.ts:26-30` — the join rate limit is hardcoded and ignores config.**
`maxRequests: 5, windowMs: 60_000` inline, while `config.rateLimiters.joinServer` exists
with exactly those defaults and is used by `http/login.ts:52`. An operator who raises the
limit in `config.ini` changes login and not join. The route also builds on `t.procedure`
directly rather than `publicProcedure`, so it skips `timingMiddleware`, and it carries no
comment explaining why it is pre-auth (AGENTS.md requires one).

Fixed: uses `config.rateLimiters.joinServer`, builds on `publicProcedure` so it gets
`timingMiddleware`, and carries the comment AGENTS.md requires explaining why it is pre-auth
(it is the handshake that authenticates the socket).

**4.7 — [DEFERRED, see T2] `others/join.ts:72-94` — the join payload is unbounded in ten dimensions at
once.** Every category, every channel the user can see, every public user, every role,
every emoji, every channel permission entry, every read state, and all plugin metadata,
in a single message, on every connect and every reconnect. Nothing here is paginated and
nothing is incremental. This is the response that decides how large a server can get.

Deferred, see **T2**. Bounding this is a design task spanning both sides, not a route
change, and every one of the ten lists has a client consumer that assumes it arrives
complete.

**4.8 — [PARTLY FIXED: logging done, storage and compare open] the server join password is stored and compared in plaintext, and then logged.**
`schema.ts:41` stores it as `text('password')` (user passwords are argon2);
`others/join.ts:57` compares with `input.password === settings.password`, not constant
time; and `update-settings.ts:94` writes `details: { values: input }` into the activity
log, so the plaintext password lands in the audit trail whenever it is set. Hash it, or at
minimum compare with `safeCompare` and redact it from the log payload.

The logging half is fixed with 4.2: `password` is destructured out of the activity-log
payload. The plaintext column and the non-constant-time comparison in `others/join.ts:57`
are **still open**.

**4.9 — [FIXED, behaviour kept by decision] `voice/move.ts:88-95` — `MOVE_MEMBERS` can pull a user into a channel they cannot
see.** `grantVoiceMove` bypasses the `JOIN` channel permission at `voice/join.ts:40`, and
`publishHiddenChannelToUser` deliberately reveals the channel. The moderator only needs
`JOIN` on the destination themselves. That is a defensible moderation feature, but it also
means `MOVE_MEMBERS` is transitively "can expose any private voice channel to any user",
which is not obvious from the permission's name. Worth an explicit decision rather than an
emergent one. The DM exclusion two lines above (with its deliberately identical error
message) shows the thinking was already applied to DMs and not to private channels.

Behaviour kept by decision: moving a user into a voice channel they cannot normally see
stays a deliberate moderation capability. What was added is the check that the **mover**
can see the destination, `assertChannelAccess(ctx, input.channelId)` before the existing
`JOIN` check, matching AGENTS.md's order (view access, then the specific permission). The
route previously verified only that the mover held `JOIN`. The bypass now carries a comment
stating plainly that the target needs neither permission and that this is intended, so it
stops being emergent.

**4.10 — [FIXED] DM channels are created as voice channels that can never host voice.**
`dms/open-direct-message.ts:63` sets `type: ChannelType.VOICE`, and
`runtimes/index.ts:17` explicitly skips DM channels when creating runtimes. So
`voice.join` on a DM passes every permission check and then fails at
`invariant(runtime, { code: 'INTERNAL_SERVER_ERROR' })` (`voice/join.ts:71`). A reachable
user action produces a 500-class error rather than a clean rejection.

Fixed with a clean rejection: `voice/join.ts` refuses `channel.isDm` with `BAD_REQUEST`
before reaching the runtime lookup, instead of failing later as `INTERNAL_SERVER_ERROR`.
Making DM voice calls actually work is a feature, not a fix, and is not in scope here.

**4.11 — [FIXED] `plugins/install-plugin.ts:26-33` — a failed download leaves the plugin
unloaded.** `unload()` runs first, `downloadPlugin` can throw (network, checksum
mismatch), and the `load()` that would restore it never runs. The plugin stays enabled in
the database and dead in the process until restart. Wrap in try/finally, or download to a
temp location first and only unload once the new bundle is verified.

Fixed with `try`/`finally`: the reload runs whether or not the download throws, so a failed
install can no longer leave the plugin enabled in the database and dead in the process.

**4.12 — [FIXED] `emojis/add-emoji.ts:17-56` — unbounded array processed in a loop, no
transaction.** The input is a bare `z.array(...)` with no `.max()`, and each element runs
`fileManager.saveFile` (disk IO, quota queries), `getUniqueEmojiName` (a query, sometimes
several) and an insert, sequentially. A failure halfway leaves some emojis created, some
temp files consumed, and returns an error, so the caller cannot tell what happened. The
rate limiter caps calls, not work per call.

Fixed: the array is bounded (`.min(1).max(20)`), and the writes are atomic. The file saves
and the `getUniqueEmojiName` lookups are async so they all happen **before** the
transaction, which then inserts the whole batch in one synchronous callback, per the
transaction rule in AGENTS.md. Publishing and logging moved after the commit. Two tests
added for the bounds.

**4.13 — [FIXED] `plugins/execute-command.ts` and `plugins/execute-action.ts` — no rate limit on
arbitrary plugin execution, and the audit entry is written before the work.** Both are
`protectedProcedure` with `USE_PLUGINS` and no limiter, so any user can drive plugin code
as fast as they can send requests. Both also `enqueueActivityLog` *before* calling the
plugin, so the log records executions that then throw; `send-message.ts:224` logs the same
event in a `.finally` instead. Pick one.

Fixed both halves: a new `config.rateLimiters.pluginExecute` (60/min) wraps both routes,
and the activity log moved into a `finally` after the call, matching `send-message.ts`, so
the entry is no longer written for an execution that then throws.

**4.14 — [FIXED] `runtimes/voice.ts:314-366` — `destroy()` closes resources but never tells
anyone.** It does remove itself from the module map (line 361), but `this.state.users` is
left populated and no `USER_LEAVE_VOICE` is published, so every client keeps rendering
participants in a channel that no longer exists. `channels/delete-channel.ts:43` also
calls `runtime.destroy()` without awaiting the returned promise, so the route can respond
before the router is closed. Compounds 3.4, where the category cascade never calls
`destroy()` at all.

Fixed: `destroy()` now clears `state.users` and publishes `USER_LEAVE_VOICE` plus the
`user:left_voice` plugin event for everyone who was still in the channel, so clients stop
rendering participants of a channel that no longer exists. Both callers now await it:
`channels/delete-channel.ts` and the loop added in `categories/delete-category.ts` for 3.4.
Covered by a new unit test in `runtimes/__tests__/voice-runtime.test.ts`.

**4.15 — [FIXED] `others/join.ts:41 vs 64` — `ctx.user.id` is read 23 lines before
`invariant(ctx.user)`.** If `ctx.user` could be undefined the route would already have
thrown a `TypeError` in `shouldAskServerPassword`; if it cannot, the invariant is dead
code. Either way one of the two lines is wrong.

Fixed: `invariant(ctx.user)` moved to the top of the handler, above the first `ctx.user.id`
read. It was dead code where it stood, 23 lines after the value had already been
dereferenced.

### LOW

**4.16 — eight voice routes open with the same ten-line preamble.**
`leave.ts:14-40`, `produce.ts:32-59`, `consume.ts:18-28`, `update-state.ts:19-58`,
`create-consumer-transport.ts:10-20`, `create-producer-transport.ts`,
`connect-consumer-transport.ts:44-54`, `connect-producer-transport.ts`,
`close-producer.ts`, `set-consumer-quality.ts` all do
`needsPermission(JOIN_VOICE_CHANNELS)` → `invariant(ctx.currentVoiceChannelId)` →
`VoiceRuntime.findById` → `invariant(runtime, INTERNAL_SERVER_ERROR)`. Ten copies of one
guard. A `getCurrentVoiceRuntime(ctx)` helper returning the runtime removes ~80 lines and
gives the "runtime missing" case one definition.

**4.17 — `others/change-logo.ts:26-38` is the third copy of the avatar/banner pattern.**
Same delete-then-save ordering bug as 3.5 (a failing `saveFile` leaves the server with no
logo), same `throw new Error('Invalid file type. Please try again.')` producing a 500
instead of `invariant`, same `temporaryFileHasMimeType` check. With
`change-avatar.ts` and `change-banner.ts` that is three copies of one operation, so it is
past the two-copy rule twice over.

**4.18 — `db.select()` for full channel rows** in `voice/join.ts:44`, `voice/leave.ts:19`
and `voice/move.ts:34`, each to read `type` and `name`. `move.ts:69` does it right for the
origin channel.

**4.19 — [FIXED with 4.2] `others/update-settings.ts:54-79` relists all 22 input fields verbatim** into
`updateSettings(...)`. The mapping is the identity function; `updateSettings(input)` is
the same code. This is also what hides 4.2 and 4.3 in the noise.

**4.20 — plugin routes log inconsistently.** `toggle-plugin` writes an activity log;
`install-plugin`, `remove-plugin` and `update-setting` do not, although installing and
removing plugins are the most security-relevant actions in the folder.

**4.21 — `emojis/update-emoji.ts:31` — renaming an emoji to its current name fails.**
`emojiExists(input.name)` matches the row being edited, so a no-op rename returns "An
emoji with this name already exists." Exclude the current id.

**4.22 — `emojis/add-emoji.ts:36` — `db.insert(...).returning().get()` without `await`,**
unlike every other insert in the codebase. It works because the bun-sqlite driver's
`.get()` is synchronous, which is exactly why the inconsistency is worth removing: the
next person to add an `await` here will not know whether it mattered.

### Missing tests

`voice.test.ts` has 11 tests, the thinnest coverage of any router, for the subsystem with
the most runtime state.

- ~~nothing asserts that `others.changeLogo` requires a permission (4.1).~~ moot, 4.1 was
  dismissed: any user may change the logo by design.
- ~~no test that saving settings without `password` leaves the password intact (4.2), or
  that saving without `enablePlugins` leaves plugins loaded (4.3).~~ added with 4.2.
- ~~no test that `others.useSecretToken` is rate limited, single-use, or logged (4.5), and
  none that calling it twice does not 500.~~ rate limiting, logging and the double-call
  case are covered; single-use is not implementable, see the correction in 4.5 and F6.
- ~~no test for a second `voice.produce` / `voice.consume` / `createConsumerTransport` call
  from the same user (4.4).~~ done exactly as prescribed, in the new
  `runtimes/__tests__/voice-runtime.test.ts`.
- ~~no test that `voice.join` on a DM channel fails cleanly (4.10).~~ added.
- ~~no test that `emojis.add` rejects an oversized array (4.12).~~ added, plus the empty case.

## 5. DB layer

Scope: `db/schema.ts` (553 lines), `db/queries/**`, `db/mutations/**`, `db/publishers.ts`,
`db/migrations/**`, plus `db/index.ts` and `db/seed.ts` which the layer depends on.

Baseline: the full suite is green as of this pass, `bun run test` → 820 server tests and
149 shared tests, 0 failures. Nothing below is a failing test; these are gaps the tests do
not cover.

The mutations are the healthiest part of this layer (`syncRolePermissions` is exactly the
shape AGENTS.md asks for). The queries are where the layer pays: several full-table scans
sit on the hottest paths, and channel permission resolution now exists in three places.

### CRIT

**5.0 — [FIXED] `db.transaction(async ...)` provided no atomicity, anywhere.** Found while
fixing 1.6, by writing a test that expected a rollback and did not get one.

`drizzle-orm/bun-sqlite/session.js:31` implements transactions like this:

```
const nativeTx = this.client.transaction(() => {
  result = transaction(tx);            // an async callback returns a pending promise here
});
nativeTx[config.behavior ?? 'deferred']();   // COMMIT runs now, synchronously
return result;
```

bun's native `Database.transaction()` wraps a **synchronous** function. When the callback
is `async` it returns a promise immediately, the wrapper sees it complete, and `COMMIT`
executes before a single awaited statement inside has run. Every statement in the callback
then executes outside any transaction, autocommitted individually. Nothing ever rolls
back. Verified directly: a sync callback that throws leaves the table untouched, an async
callback that throws leaves the write committed.

Eleven call sites are written this way, ten of them predating this audit:
`routers/users/delete-user.ts`, `routers/dms/open-direct-message.ts`,
`routers/channels/update-permission.ts`, `routers/channels/delete-permissions.ts`,
`routers/channels/reorder-channels.ts`, `routers/categories/reorder-categories.ts`,
`routers/roles/set-default-role.ts`, `routers/channels/add-channel.ts`,
`db/mutations/roles.ts`, `db/mutations/users.ts` (and `http/login.ts`, fixed as part of
1.6).

This invalidates the reassurance in several findings above and in AGENTS.md itself
("Group multi-statement writes in `db.transaction()` … keeps the data consistent on
failure", "Reorder/permission/delete routes already do it"). Concretely, it means
`delete-user`'s reassignment is not atomic (3.2 fails *and* leaves partial reassignment),
`syncRolePermissions` can delete a role's permissions and fail to reinsert them, and
`set-default-role` can clear the old default without setting the new one.

Fixed: all eleven call sites converted to synchronous callbacks with `.run()` / `.get()` /
`.all()`; no `transaction(async` remains in the repo. `db/mutations/users.ts` lost its
query-inside-a-loop in the process (one `insert … onConflictDoNothing` replaces a select
and an insert per affected user, which the `(userId, roleId)` primary key makes safe).
AGENTS.md's transaction rule now states the constraint, and
`__tests__/transactions.test.ts` guards rollback, commit and mid-transaction rollback so a
reintroduced `async` callback fails the suite.

**5.1 — [NOT A FINDING, by your decision] `db/queries/server.ts:66-86` — the JWT signing key is `sha256(ownership token)`,
and the ownership token is printed for a human to keep.** One value does three unrelated
jobs:

- `db/seed.ts:47-56` generates `originalToken` and stores `secretToken = sha256(token)`;
- `db/seed.ts:212` prints `originalToken` to the console at first boot, with the notice
  "save this access token somewhere safe … anyone with this token can take over the
  server", for the admin to later type into `others.useSecretToken`;
- `getServerToken()` returns that stored `sha256(token)` and it is used as the **JWT
  signing secret** (`http/login.ts:283`) and as the **HMAC key for signed file URLs**
  (`helpers/files-crypto.ts:6`).

sha256 of a known string is a one-line computation, so anyone who has ever been shown the
ownership token holds the server's session-signing key. They do not need to call
`useSecretToken` (which at least inserts a role row): they can mint
`jwt.sign({ userId: <any id> }, sha256(token))` offline and authenticate as **any user,
including the owner**, with no database write, no activity log, and no way to detect it.
The same value forges access tokens for every signed file URL. There is no rotation path:
changing ownership does not change the key, and changing the key would invalidate every
session and every signed URL.

In development this is worse in kind, not just degree: `originalToken` is the literal
string `'dev'`, so every development instance signs its JWTs with the publicly known
constant `sha256('dev')`.

The notice is honest about the token being a takeover credential. What it does not say,
and what the design does not survive, is that the token is *also* the signing key, so
sharing it once is permanent and undetectable impersonation of everyone.
Fix: generate an independent random JWT secret (and a separate file-URL HMAC secret) at
seed time, store them alongside `secretToken`, and never derive one from the other. Add a
rotation path while you are there.

**Dismissed.** The token is meant to be a private key, and the server using it to sign JWTs
and file URLs is the intended design rather than an accident. Nothing was changed. The
consequences described above still follow from that design (whoever holds it can mint
tokens for any user offline, and it cannot be rotated without invalidating every session),
so they are now properties to be aware of rather than a defect. F6 records the one part
that remains a live constraint: because the value is the signing key, 4.5's "make the
ownership token single use" is not implementable.

### HIGH

**5.2 — [FIXED] `db/queries/files.ts:8-53` — the storage-overflow reclaim deletes avatars,
banners, emojis and the server logo.** `getExceedingOldFiles` selects from `files`
ordered by `createdAt` with no filter on what the file is *for*, and
`utils/file-manager.ts` `handleStorageLimits` passes each result to `removeFile`, which
deletes the row and unlinks the file from disk. The `files` table holds every upload:
message attachments, avatars (`users.avatarId`, `onDelete: 'set null'`), banners, custom
emojis (`emojis.fileId`) and the server logo (`settings.logoId`). So when
`storageOverflowAction` is `DELETE_OLD_FILES` and the quota is reached, the server
silently deletes the oldest files on the server, which are by definition the founding
admin's avatar, the original emoji set and the server logo, to make room for someone's
attachment. Users see their avatars vanish with no explanation.
Fix: restrict the candidate set to message attachments (`EXISTS (SELECT 1 FROM
message_files …)`), and exclude anything referenced by `users`, `emojis` or `settings`,
which is the inverse of the query `getOrphanedFileIds` already writes.

Fixed exactly that way: the candidate query now requires a `message_files` row and excludes
anything referenced by `users.avatarId`/`bannerId`, `emojis`, `message_reactions` or
`settings.logoId`, mirroring `getOrphanedFileIds`. The "take oldest until enough freed" loop
stays in JavaScript by decision, so the candidate rows are still read into memory, but only
attachments rather than every file on the server.

Note on what this does **not** reclaim: a file with no `message_files` row is now skipped
entirely, including genuine orphans. Those are already the orphan cron's job
(`getOrphanedFileIds`), and excluding them also closes a race where a file saved seconds
earlier, on its way to being attached to a message, could be deleted before the message
row existed.

The existing test `should delete old files when storage limit exceeded with
DELETE_OLD_FILES` was asserting the old behaviour: it saved a file attached to no message
and expected it to be reclaimed. Updated to attach it to a message, which is the realistic
case. A new test asserts an avatar survives a reclaim that its own size triggered, and it
fails against the unfiltered query.

**5.3 — [FIXED] `db/queries/channels.ts:440-495` — `getChannelsReadStatesForUser` aggregates the
entire `messages` table, and it is on the hot path.** The query has no upper bound and no
time window: it joins `messages` to `channels` and `channelReadStates` and groups by
channel across all history. It runs on every WebSocket join (`others/join.ts:90`), on
**every page of `messages.get`** (`get-messages.ts:185`), and on every DM list fetch
(`dms.ts:76`). SQLite runs in the server process, so on a server with a million messages
every scroll-up blocks the event loop for every connected user.
Fix: bound it. Unread counts only need messages newer than the user's
`lastReadMessageId`, which the composite index can serve directly, and the result only
needs recomputing when that pointer moves. The `CHANNEL_READ_STATES_DELTA` optimisation in
`publishers.ts:62` shows the pattern already exists for the publish path; the read path
never got it.

**Correction to the finding's scope:** by the time this was fixed there were only two
production callers, `others/join.ts` and `channels/mark-as-read.ts`. `get-messages.ts` no
longer calls it, that went away when 2.11 rewrote the read-state handling, and the `dms.ts`
call named in the finding is not there either. So this was one query per join and per
mark-as-read, not one per page of messages.

Fixed by inverting the query: it is now driven from `channels` with `messages` LEFT JOINed,
and every unread predicate (`userId != me`, `parentMessageId IS NULL`,
`id > lastReadMessageId`) moved from a `COUNT(CASE ... END)` over the whole table into the
join condition, so a channel the user has caught up on costs an index seek instead of a scan
of its history. The DM filter moved to `channels.id` with `inArray`, replacing hand-built
`sql.join` interpolation.

Output shape preserved exactly, which took one extra condition to get right. The old query
produced an entry for a channel that has messages but no unread (`0`) and **no entry at
all** for a channel that has never had a message. The channels-driven version returned `0`
for both until an `EXISTS (SELECT 1 FROM messages ...)` was added. Two existing tests
encode that distinction deliberately, and both pass unchanged; the whole suite passes with
no test edits.

Fully realising this needs **5.11**'s composite index: the predicates are now indexable,
but the index that fits them does not exist yet.

**5.4 — [FIXED] channel permission resolution now exists in three places with three different
rule sets.** `utils/wss.ts:100` (`hasChannelPermission`, used by every route),
`db/queries/channels.ts:87` (`channelUserCan`, used by `publishers.ts:200,223`) and
`db/queries/channels.ts:170` (`getAllChannelUserPermissions`, sent to the client on join).
They disagree:

| | DM participant | non-private channel | requires VIEW_CHANNEL |
| --- | --- | --- | --- |
| `hasChannelPermission` | grants all | grants all | yes |
| `channelUserCan` | **no branch** | grants all | no |
| `getAllChannelUserPermissions` | grants all | grants none | no |

`channelUserCan` returning `false` for a DM participant is currently masked: its only
callers are the voice-move publishers, and DM voice channels get no runtime
(`runtimes/index.ts:17`), so the path is unreachable. The moment DM calls are enabled, the
comment at `open-direct-message.ts:63` says that is the plan, `unpublishHiddenChannelFromUser`
will fire a `CHANNEL_DELETE` at participants for their own DM. Meanwhile the third
implementation is what the client caches and renders from, so client and server can
disagree about a public channel's permissions (the client sees all-false, the server says
all-true; see the corrected 2.1).
Fix: one function, in `db/queries/channels.ts`, that the wss context and the publishers
both call.

Fixed for the two resolvers that actually gate access. `channelUserCan` is now the single
rule: channel missing -> false, DM -> membership decides and nothing else, non-private ->
true (deliberate, see the corrected 2.1), owner -> true, otherwise `VIEW_CHANNEL` must
resolve true **and** the requested permission must resolve true. `hasChannelPermission` in
`utils/wss.ts` is a one-line delegation to it, so every route and every publisher now
answer from the same code. It also stopped calling `getAllChannelUserPermissions`, which
built the entire channel x permission matrix to answer one question.

The third implementation, `getAllChannelUserPermissions`, is left as it is: it is the
client-facing matrix, not an authorization check, and the client already mirrors the
non-private rule itself in `features/server/helpers.ts` `canViewChannel`. Aligning it is a
client-visible change with no test coverage on that side, so it stays out of a fix for a
server-side divergence.

**This tightened a real hole:** the old `hasChannelPermission` fell through the DM branch
for a non-participant and then returned true for the **owner**, so the owner passed the
channel-permission check on other people's DMs. It was masked because `assertChannelAccess`
runs `assertDmChannel` alongside it. Now both reject, which surfaced as five tests
asserting the DM-specific error message and getting the generic one: `Promise.all` made it
a race and the permission rejection won. `assertChannelAccess` and `signal-typing` now run
the DM membership check first and on its own, so the error names the actual reason. That is
one extra round trip on those paths, taken deliberately for the better message.

New `db/__tests__/channel-permissions.test.ts` pins all six rules. The two DM cases fail
without the DM branch, which is exactly the divergence this finding described.

### MED

**5.5 — [FIXED] `db/index.ts:14 — WAL is not enabled.** The only pragma set is
`foreign_keys = ON`. SQLite therefore runs in `journal_mode = DELETE` with
`synchronous = FULL` and no `busy_timeout`: every write takes an exclusive lock on the
whole database and blocks readers, and every transaction pays a full fsync. For an
embedded database serving a realtime chat server this is the single highest-value line in
the file.
Fix: `PRAGMA journal_mode = WAL; PRAGMA synchronous = NORMAL; PRAGMA busy_timeout = 5000;`
next to the existing pragma.

Fixed: `journal_mode = WAL`, `synchronous = NORMAL` and `busy_timeout = 5000` added next to
the existing `foreign_keys` pragma, with a comment on why. Readers no longer block behind a
write, and a concurrent writer waits instead of failing outright with `SQLITE_BUSY`.

**5.6 — [FIXED] `db/queries/server.ts:10-35` — `getSettings()` is the most-called query in the
application and it is two round trips, uncached.** `select * from settings`, then a
second query for the logo file. It is called by `send-message`, `assertDmChannel` (so
transitively by `assertChannelAccess`, so by every message route),
`joinMessagesWithRelations` (every page), `upload.ts` (every upload), `public.ts` (every
file request), `getFilesByUserId`, `attachFileToken` callers, and more, several times per
request. AGENTS.md says not to reach for a cache first, so start with the query shape:
one `leftJoin` on `files` makes it a single round trip. A settings row that changes only
through `others.updateSettings` is also the one row in the schema where an in-process
cache invalidated by `publishSettings` is defensible.

Fixed by query shape, not by a cache: one `leftJoin` on `files` replaces the settings read
plus the separate logo read, so the most-called query in the application is a single round
trip. The in-process cache the finding calls defensible was **not** added, per AGENTS.md's
"fix the query shape first".

**5.7 — [FIXED] `db/queries/channels.ts:256-267` — a query inside a loop over every channel.**
`getAllChannelUserPermissions` iterates `allChannels` and, for each DM channel, awaits
`isUserDmParticipant(channel.id, userId)`. One query per DM channel per call, and the call
happens on every join and on every `publishChannelPermissions`. It also opens with
`db.select().from(channels)` (all columns, all rows) and builds the full
`|channels| x |ChannelPermission|` matrix in JavaScript.
Fix: `getDirectMessageChannelIdsForUser(userId)` once (that helper already exists and is
used two functions above), then a `Set` lookup.

Fixed: `getDirectMessageChannelIdsForUser(userId)` runs once, in the same `Promise.all` as
the channel read, and the loop tests a `Set` instead of awaiting `isUserDmParticipant` per
DM channel. The channel read also stopped selecting every column, it only needs `id` and
`isDm`.

**5.8 — [FIXED] `db/queries/channels.ts:134-168` — `getChannelsForUser` reads every channel and
filters in JavaScript,** including `dmChannelIds.includes(channel.id)` inside the filter,
which is O(channels x dms). AGENTS.md: `where` beats `.filter()`. The owner branch above
it does `db.select().from(channels)` with no column list either.

Fixed the O(channels x dms) part: `dmChannelIds` becomes a `Set` before the filter. The
JavaScript filter itself stays, because the function returns `TChannel[]` so the full rows
are needed anyway, and the permission precedence (user override beats role) is awkward to
express in SQL for a list bounded by the number of channels on the server.

**5.9 — [FIXED] `db/queries/channels.ts:163,420-438` — every publish to a public channel scans the
users table.** `getAffectedUserIdsForChannel` returns `getAllUserIds()` for any
non-private channel, and `getAffectedOnlineUserIdsForChannel` then does
`affectedUserIds.filter(id => onlineUserIds.includes(id))`, an O(n x m) array scan. This
runs on every message create, update and delete (`publishers.ts:29,50`). The online set is
small and already in memory; iterate that and test membership in the affected set, and
skip the user scan entirely when the channel is public (every online user is affected by
definition).

Fixed by inverting the intersection: the online set is read first and, for a public
non-DM channel, returned as is, since every online user is affected by definition and there
was no point reading the users table to intersect it with itself. For private and DM
channels the affected ids go into a `Set` and the online list is filtered against it, so the
O(n x m) array scan is gone.

**5.10 — `db/mutations/users.ts:23-41` — `fallbackUsersToDefaultRole` queries inside a
loop.** One `select` per affected user to check whether they already hold the default
role, inside a transaction. A single
`insert … values(all) onConflictDoNothing()` against the `(userId, roleId)` primary key
replaces the whole loop.

**5.11 — [FIXED] the hottest query in the app has no index that fits it.** Every channel read is
`WHERE channelId = ? AND parentMessageId IS NULL ORDER BY createdAt DESC`
(`get-messages.ts:51`, `mark-as-read.ts:29`, `get-messages.ts:162`, `http/login.ts:220`).
The best available index is `messages_channel_created_idx (channelId, createdAt)`, so
SQLite walks the channel's entire history in date order discarding thread replies. A
composite `(channelId, parentMessageId, createdAt)` serves the filter and the sort
exactly. Adding it is a schema change plus a migration.

Fixed: composite index `messages_channel_parent_created_idx (channelId, parentMessageId,
createdAt)`, migration `0019_messages_channel_parent_created_index.sql`, one statement.

Verified rather than assumed, with `EXPLAIN QUERY PLAN` on the real query shape:

```
BEFORE: SEARCH messages USING INDEX messages_channel_created_idx (channel_id=?)
AFTER:  SEARCH messages USING INDEX messages_channel_parent_created_idx (channel_id=? AND parent_message_id=?)
```

The planner now filters on both columns instead of walking the channel's whole history in
date order discarding thread replies. This is also what makes 5.3's rewrite pay off.

**5.12 — [FIXED] `db/schema.ts:36-111` — the settings table has no primary key.** Single-row-ness
is enforced by convention: `getSettings` takes `.get()` (whatever row comes first) and
`updateSettings` writes `WHERE name IS NOT NULL` (`db/mutations/server.ts:10`), which is
"all rows" spelled defensively. A second row inserted by any means, a bad migration, a
plugin, a manual fix, silently splits the server's configuration in two with no error.
Add an `id` column constrained to a single value, or a `CHECK` constraint.

Fixed with a unique index over a constant expression:
`CREATE UNIQUE INDEX settings_single_row_idx ON settings ((1))`, migration
`0020_settings_single_row_index.sql`. Every row indexes the same value, so a second row is
impossible at the database level, with no table rebuild and no data movement, which matters
on the table holding the server's identity and secret token. Declared in `schema.ts` as
`uniqueIndex('settings_single_row_idx').on(sql\`(1)\`)` so drizzle-kit knows about it and
will not try to drop it on the next generate. `db:check` passes.

A test inserts a second row with a **different** `serverId`, so it is refused by the new
index rather than by the pre-existing unique index on `serverId`.

**5.13 — [PARTLY FIXED] `db/index.ts:4` — production code imports the test seed.**
`import { seedTestDb } from '../__tests__/seed'` sits at module scope in the file that
boots the database, selected at runtime by `IS_E2E`. Test fixtures are compiled into the
shipped binary, and an environment variable decides whether real data or fixtures are
written. Move the E2E seeding behind the test harness.

Partly fixed, by decision: the static `import { seedTestDb } from '../__tests__/seed'` is
replaced by an `await import(...)` inside the `IS_E2E` branch, so a normal boot never loads
the fixture module. This is honest about what it does **not** do: the specifier is still
static, so a bundler can follow it and the fixture code can still end up in the binary. The
audit's literal fix, moving the seeding into a playwright `globalSetup` so `db/index.ts`
loses the branch entirely, was not done: the e2e suite starts the real server with
`bun dev` and `IS_E2E=true`, there is no harness hook today, and I cannot run playwright
here to verify a change to how e2e boots.

**5.14 — [FIXED] `db/publishers.ts:165` — `db.select().from(users).all()` to collect ids.**
Every column of every user, including `password`, `identity` and `banReason`, read into
memory to build an array of ids, in a function that calls `getAllUserIds()` (which selects
only ids) forty lines earlier. Also `filter(id => !affectedUserIds.includes(id))`, O(n²).

Fixed: `getAllUserIds()` (which selects only ids, and was already imported in the file)
replaces `db.select().from(users).all()`, so `password`, `identity` and `banReason` are no
longer read into memory to build a list of ids, and the `includes` inside the filter becomes
a `Set` lookup.

### LOW

**5.15 — roughly a dozen indexes cost writes and serve nothing.** Two categories:

- *Leftmost-prefix duplicates*, redundant with a composite index or a primary key already
  covering them: `messages_channel_idx` (covered by `messages_channel_created_idx`),
  `logins_user_idx`, `activity_log_user_idx`, `activity_log_type_idx`,
  `channels_category_idx`, `reaction_msg_idx`, `user_roles_user_idx`,
  `role_permissions_role_idx`, `channel_read_states_user_idx`,
  `channel_role_permissions_channel_idx`, `channel_user_permissions_channel_idx`.
- *Boolean and unused columns*, where an index over two distinct values cannot help the
  planner: `channel_role_permissions_allow_idx`, `channel_user_permissions_allow_idx`,
  `roles_is_default_idx`, `roles_is_persistent_idx`, `users_banned_idx`, plus
  `invites_uses_idx` on a column nothing filters by.

Every one of them is maintained on each insert and update to those tables.

**5.16 — `migrations/0005_normalize_user_identities.sql:17` contains the exact bug
AGENTS.md warns about.** The separator is written `-->statement-breakpoint`, with no
space, so drizzle never split the file and the second statement (`UPDATE users SET
identity = LOWER(identity)`) was silently skipped while the migration was recorded as
applied. `0006_lowercase_remaining_identities.sql` is the repair: the same two statements
with the correct separator. The warning in AGENTS.md is therefore a post-mortem, not a
precaution. Nothing to fix (an applied migration must never be edited), but 0005 is still
in the tree as a template for the next person who copies a neighbouring migration. Worth a
comment at the top of the file saying so.

**5.17 — `db/mutations/files.ts:11` deletes `messageFiles` rows by hand** although
`message_files.file_id` is declared `onDelete: 'cascade'` (`schema.ts:304`). AGENTS.md:
let the database cascade.

**5.18 — unbounded reads in `queries/files.ts`.** `getFilesByUserId` (every file a user
ever uploaded, with a signed token minted for each), `getUsedFileQuota` and
`getOrphanedFileIds` (full-table `NOT EXISTS` across five tables) all return everything.
The last two are cron/quota work rather than request work, but `getFilesByUserId` is
called by `users.getInfo` (see 3.8).

**5.19 — `messages.userId` is nullable *and* `onDelete: 'cascade'`** (`schema.ts:262`).
The nullable column suggests messages are meant to survive their author, which is what
`delete-user.ts`'s placeholder reassignment implements, but the cascade means the `wipe`
path deletes them instead. Two mechanisms for one decision. Cross-reference 2.6 and 3.1.

**5.20 — `db/index.ts:2` imports the `better-sqlite3` migrator** while the client is
`bun-sqlite`. It works today because the migrator only issues SQL through the passed
drizzle instance; it is still two driver packages crossing in the one file that must not
break.

### Missing tests

The suite is green and the DB layer is well covered for behaviour. What is missing is
coverage of the properties above, all of which are assertable in the existing harness:

- nothing asserts that the JWT signing key is independent of `secretToken` (5.1). A test
  that signs a token with `sha256('dev')` and expects `getUserByToken` to reject it would
  fail today, and would keep failing until the keys are separated. This is the test to
  write first.
- ~~nothing asserts that `DELETE_OLD_FILES` leaves avatars, emojis and the logo alone
  (5.2).~~ added, and verified failing against the unfiltered query.
- ~~no test for `channelUserCan` against a DM channel (5.4).~~ added, along with the public,
  private, owner and missing-channel rules.
- ~~no test that the `settings` table stays single-row (5.12).~~ added, and it is now
  enforced by the database rather than by convention.
- `setup.test.ts` asserts seeded row counts, so it would catch an accidental second
  settings row at seed time only.

## 6. Plugin subsystem

Scope: `apps/server/src/plugins/**` (index.ts is 736 lines, plus eight registry/manager
files) and `packages/plugin-sdk/**`. Pulled in: `helpers/downloads.ts` and
`helpers/marketplace.ts`, which are the install path.

This is the best-tested subsystem in the server (1227 lines of `plugin-manager.test.ts`,
586 of `event-bus.test.ts`), and the registries are clean, pluginId-scoped and symmetric.
The findings are about the security model rather than the code quality: the boundary the
architecture implies does not exist.

**Verified safe, recorded so it is not re-audited:** archive extraction is not vulnerable
to path traversal. I built a tar whose single member is literally `../../escaped.txt` and
extracted it with `Bun.Archive` the way `downloadPlugin` does; the file landed inside the
extraction root, not above it. `zPluginId` (`/^[a-z0-9-]+$/`) also makes traversal through
`manifest.id` impossible.

### HIGH

**6.1 — [NOT A FINDING, by your decision] plugins are not sandboxed; they are the server.** `index.ts:407` loads a plugin
with `await import(moduleSpecifier)` into the main process. There is no VM, no worker, no
permission model at the module level. The carefully scoped `PluginContext`
(`index.ts:509-707`) is an ergonomics layer, not a boundary: a plugin can ignore it and
`import { db } from '../db'`, read `process.env`, open sockets, or patch globals. AGENTS.md
lists "sandboxing" as one of the responsibilities of `plugins/`; nothing in the folder
sandboxes anything.

For a self-hosted server this may well be the intended trade-off, and it is the normal one
for Node plugin systems. What makes it a finding is the chain it completes with chunk 3:
`MANAGE_ROLES` can grant itself `MANAGE_PLUGINS` (3.3), `MANAGE_PLUGINS` installs an
arbitrary marketplace bundle, and that bundle runs as the server process with the database
handle and the JWT signing key (5.1) in reach. So a moderator with role-management rights
has a path to remote code execution, and none of the permission names say so.
Fix, in order of cost: document it plainly in the plugin docs and in the
`MANAGE_PLUGINS` permission description; close 3.3 so the permission cannot be
self-granted; and only then consider whether isolation is worth the complexity.

**Dismissed.** Unsandboxed plugins are intended, and it is already documented in the online
docs. Nothing changed in the plugin loader or the permission text.

Two notes that survive the dismissal:

- the escalation chain this finding described is **already broken** at its first link. 3.3
  closed the path where `MANAGE_ROLES` self-grants `MANAGE_PLUGINS`, so reaching plugin
  installation now requires actually being given `MANAGE_PLUGINS`.
- `AGENTS.md` listed "sandboxing" as a responsibility of `plugins/` while nothing in the
  folder sandboxes anything (`grep -rn sandbox plugins/` returns nothing). Corrected to say
  isolation is deliberately not attempted, since that line is instruction material for
  agents working in this repo.

**6.2 — [FIXED] disabling a plugin does not stop it running.** `unload()` (`index.ts:601`) calls
`onUnload`, clears the registries, and deletes the module from the map. It cannot free the
module: anything the plugin started outside the registries keeps going, so a
`setInterval`, an open socket, an event listener on a global, or a monkey-patched
prototype survives the toggle for the lifetime of the process. Nothing enforces that a
plugin implements `onUnload` at all (it is optional in `PluginModule`).

The cache invalidation on top of that is doubled and probably inert:
`invalidateDynamicImportCache` (`index.ts:241`) scans `require.cache`, but the module was
loaded as ESM through `import()` of a `file://` URL, which does not populate
`require.cache`. The mechanism that actually works is the
`?version&mtime&size` query string in `getPluginModuleSpecifier` (`index.ts:236`), which
means a reinstall that produces an identical mtime and size silently reuses the old
module.
Fix: at minimum, make the UI honest ("disabled, restart to fully unload"), require
`onUnload`, and delete whichever of the two cache mechanisms is dead once you have
established which.

**Correction: this finding had the two cache mechanisms exactly backwards.** Established by
running both against bun rather than reasoning about them:

```
require.cache after an ESM import() of a file:// URL  -> 1 entry, key is the plain file path
  (so cacheKey.startsWith(serverEntryPath) does match)
delete that entry, re-import the same specifier       -> module re-evaluates (1 -> 2)
import ?version=1&mtime=100&size=10 then ?version=2&mtime=999&size=99
                                                      -> same module instance, NOT busted
```

So `invalidateDynamicImportCache` is the mechanism that **works**, and the query string is
the dead one: bun resolves a module by path and ignores the query. Had the finding been
followed as written, the working mechanism would have been deleted and the inert one kept.

Fixed:

- `getPluginModuleSpecifier` returns a plain `file://` URL and no longer stats the entry
  file to build a query string, with a comment recording why.
- `onUnload` is now **required**: `PluginModule` declares it non-optional and `load()`
  refuses a plugin without it, the same way it already refused one without `onLoad`. This
  breaks any existing plugin that omits it, which was the accepted cost.
- `unload()` carries a comment stating plainly that it frees only what the registries know
  about, and that a timer, socket, global listener or patched prototype survives until the
  process restarts. That is the reason `onUnload` is mandatory rather than advisory.

Fixture and test updates: five mock plugins that must load gained an `onUnload`, and
`should load plugin without onUnload` became `should fail to load plugin without onUnload`
(asserting `loadError`, since `load()` records rather than rejects). The pre-existing
`should load updated plugin code after server entry changes` still passes, which is
independent confirmation that the cache delete is what makes a reload pick up new code.

Not done: the UI still says "disabled" with no hint that a restart is needed to fully
unload, and the SDK has no `PluginModule` type to make the new requirement visible to plugin
authors before they hit the load error.

**6.3 — [FLAGGED, out of scope for now, see F7] every plugin HTTP route is an unauthenticated public endpoint, by
construction.** The SDK's handler type is
`(req: IncomingMessage, res: ServerResponse) => unknown`
(`plugin-sdk/src/index.ts:50`): no user, no session, no context. The dispatcher
(`http/index.ts:143-151`) calls it directly, before any authentication, with no rate
limiter and no body limit (see 1.3). So `ctx.http.get('/data', handler)` publishes
`/plugins/<id>/data` to the internet, and the SDK offers no helper to require a logged-in
user. The insecure thing is not merely possible, it is the only thing available.
Fix: pass an authenticated context to plugin handlers (resolve the token the way
`getUserByToken` does and hand the plugin a `user`), or provide an explicit
`ctx.http.authenticated.get(...)` variant, and rate limit the plugin route namespace.

**6.4 — [NOT A FINDING, by your decision] installing one plugin can overwrite another.** `downloadPlugin`
(`helpers/downloads.ts:98-101`) computes its destination from the **downloaded archive's**
`manifest.id`, not from the `pluginId` the admin asked for, and then does
`fs.rm(targetPluginPath, { recursive: true, force: true })` before copying. A marketplace
entry published under `plugin-a` can therefore ship a manifest with `id: "plugin-b"` and
replace the installed `plugin-b` on disk. `install-plugin.ts` compounds it: it unloads and
reloads `input.pluginId`, so the hijacked plugin keeps running from its old module while
its files on disk are someone else's code, until the next restart loads them.
Fix: `invariant(manifest.id === requestedPluginId)` before writing anything, and pass the
requested id into `downloadPlugin`.

**Dismissed.** Plugin ids are unique, so the manifest id is the plugin's identity and
installing to the path it declares is intended. Nothing changed.

One thing the dismissal does not cover, recorded rather than argued: uniqueness makes two
*honest* plugins impossible to confuse, but the write path still trusts the id inside the
downloaded archive rather than the one the admin asked for, so a bundle published under one
id that declares another still lands on top of the second plugin's directory. If the
marketplace enforces that a bundle's manifest id matches the entry it is published under,
that is closed upstream and there is nothing to do here.

### MED

**6.5 — [FIXED] `helpers/downloads.ts:112-124` — the download has no size cap and no timeout.**
`fetch(url)` with no `AbortSignal`, then `Bun.write(file, res)` streams the whole response
to disk. The checksum is verified only after the file has fully landed (line 78), so a
hostile or compromised marketplace entry fills the disk before the integrity check gets a
chance to reject it. Cap the bytes written and abort past the limit; a plugin bundle has a
sane maximum size.

Fixed: `downloadFile` now aborts after 60s (`AbortSignal.timeout`), rejects a declared
`content-length` over 100MB, and streams through a reader counting bytes as they arrive,
abandoning the write and deleting the partial file the moment the cap is passed.
`content-length` is the sender's claim, so the running count is what actually enforces it.

**6.6 — [FIXED] `plugins/execution-timeout.ts:5-25` — the timeouts do not time anything out.**
`withTimeout` is `Promise.race` against a `setTimeout`. It rejects the *caller* and leaves
the handler running: side effects still land after the "timeout", and a handler that
blocks synchronously (a tight loop, a large sync JSON parse, `readFileSync` on something
big) freezes the event loop, so the timer that was supposed to fire cannot. Against
untrusted plugin code this is a reporting mechanism, not a control, and it is the only one
the subsystem has. Worth a comment saying so at minimum, since the constant names
(`COMMAND_EXECUTION_TIMEOUT_MS`) promise more than the implementation delivers.

Fixed as the finding asked, with a comment rather than a mechanism: `withTimeout` now states
that it rejects the caller without stopping the task, that side effects still land
afterwards, and that a synchronously blocking handler freezes the loop so the timer cannot
fire at all. Against plugin code, which runs unsandboxed in this process by design (6.1),
it is a reporting mechanism rather than a control, and the constant names promised more
than that.

**6.7 — [OUT OF SCOPE, by your decision] `index.ts:216` — SDK compatibility is exact equality.** `sdkVersion !==
PLUGIN_SDK_VERSION` means bumping `PLUGIN_SDK_VERSION` from 1 to 2 breaks every published
plugin simultaneously, with no deprecation window and no way for a plugin to declare a
supported range. With a marketplace in the picture that is a coordination problem, not a
version check. Accept a minimum-supported version, or a range.

**6.8 — [FIXED] `packages/plugin-sdk/package.json` — mediasoup is a devDependency but appears in
the public API.** `TCreateStreamOptions`, `TExternalStreamHandle` and `voice.getRouter`
all reference `Producer` / `Router` from `mediasoup/types`. An external plugin author
installing the SDK gets unresolved types unless they happen to install mediasoup
themselves. `react` is correctly declared as a peer dependency; mediasoup should be too.

Fixed: `mediasoup` added to `peerDependencies` alongside `react`, so an external plugin
author gets the types the SDK's public API already references.

**6.9 — [FIXED] `plugin-settings-manager.ts:167-190` — a setting's value is not checked against
its declared type.** `updateSetting` verifies the key is registered and then stores
whatever arrived; the route (`plugins/update-setting.ts:12`) accepts
`z.union([z.string(), z.number(), z.boolean()])`. So a setting declared as `number` can be
persisted as a string, and the plugin reads it back with the wrong type. Validate against
the registered `TPluginSettingDefinition`.

Fixed: `updateSetting` rejects a value whose `typeof` does not match the registered
definition's `type`, so a setting declared as `number` can no longer be persisted as a
string. A test covers it and asserts the stored value is unchanged after the rejection.

**6.10 — [FIXED as 4.11] a failed install leaves the plugin unloaded** (recorded as 4.11 in the routes
chunk; the cause lives here). `install-plugin.ts` unloads first and only reloads on
success, and `downloadPlugin` can throw at four separate points.

### LOW

**6.11 — [FIXED] `index.ts:718-729` — `createUnloadContext` builds the entire context to throw
most of it away.** It calls `createContext(pluginId)`, which constructs every registry
closure including `http.register` and `commands.register`, then returns seven of the
fields. A plugin that captured the discarded closures during `onLoad` could still register
routes from inside `onUnload`.

**Correction to the finding:** the security half does not hold. `unload()` calls `onUnload`
**before** `cleanupPluginRegistrations`, so anything a captured closure registers during
`onUnload` is wiped immediately afterwards.

Fixed anyway, by decision, for the waste: `createSharedContext` now builds the parts an
unload context needs (path, logger, ui, voice, messages) and both `createContext` and
`createUnloadContext` use it, so unloading no longer constructs the registration closures
(`http`, `commands`, `actions`, `settings`, `hooks`) only to discard them.

**6.12 — [FIXED] the context exposes its logger twice.** `index.ts:524-525` does
`logger: scopedLogger` *and* `...scopedLogger`, so `ctx.logger.debug(...)` and
`ctx.debug(...)` are both public API and both documented in the SDK type. One of them
should go before plugins depend on both.

Fixed **without** breaking existing plugins, after the first attempt was reverted.

The first pass dropped the flat form entirely. That was then reversed on the grounds that
existing plugins should not break now: `ctx.log` / `ctx.debug` / `ctx.error` are still on the
context and still in the `PluginContext` interface, but each carries an `@deprecated` tag
pointing at `ctx.logger.*`, so editors and `tsc` steer new code to the supported form while
published plugins keep working. `UnloadPluginContext` keeps them too.

The repo's own plugins were migrated to `ctx.logger.*` during the first pass and stayed that
way, since they are the examples people copy. **`plugin-b` was deliberately left on
`ctx.log`** with a comment saying why: it is the guard. Removing the aliases fails five
tests in `plugin-manager.test.ts` (verified), rather than passing here and breaking
plugins in the wild.

So there is no breaking change to publish. Removing the aliases later is a separate,
deliberate decision, and the deprecation tags are what make that eventually safe.

**6.13 — [FIXED] the SDK's data accessors are untyped.** `data.getUser`, `data.getChannel` and
`data.getPublicUsers` are declared to return `Promise<unknown>`
(`plugin-sdk/src/index.ts:218-222`), so every plugin author casts. The concrete types
exist in `packages/shared` and the SDK already imports from there.

Fixed: `data.getUser` and `data.getPublicUsers` return `TJoinedPublicUser`, `data.getChannel`
returns `TChannel`, both imported from `packages/shared`, which the SDK already depends on.
The implementations already returned exactly these shapes.

**6.14 — [FIXED] nothing bounds what a plugin registers.** Routes, commands, actions, settings
and event handlers all accumulate in unbounded maps. Not exploitable given 6.1 (a hostile
plugin has better options), but it means a buggy plugin in a loop grows memory with no
diagnostic.

Fixed with a cap in the two places that cover the accumulating maps: 100 registrations per
plugin per kind in `PluginExecutableRegistry.registerDefinition` (commands and actions), and
100 HTTP routes per plugin in `PluginHttpRouteRegistry.register`. Both throw with a message
naming the plugin and the limit, so a plugin registering in a loop fails loudly instead of
growing memory silently. Event handlers and settings were left unbounded: settings arrive as
one array in a single `register` call, and the event bus keys by handler identity.

**6.15 — [SKIPPED, by your decision] the SDK ships raw TypeScript.** `main` and `types` both point at
`src/index.ts`. Fine inside the monorepo, a hard requirement on the toolchain of any
external plugin author.

Skipped by decision. The SDK stays TypeScript-source-only (`main` and `types` both point at
`src/index.ts`), so consuming it requires a TypeScript toolchain. Note there is a stale
`dist/index.js` in the package with no build script that produces it.

### Missing tests

The subsystem has the strongest coverage in the repo, so the gaps are specific and all of
them are reachable in the harness:

- no test that a bundle whose `manifest.id` differs from the requested plugin id is
  rejected (6.4). This is the one to write first: it is a two-line assertion and it fails
  today.
- ~~no test that unloading a plugin stops its side effects (6.2).~~ partly: the fixture
  without `onUnload` is now a load failure rather than a silent leak, so the "no cleanup at
  all" case cannot happen. A fixture that sets an interval and *does* implement `onUnload`
  badly would still document the surviving-side-effect case.
- `http-route-registry.test.ts` (55 lines) covers registration and matching but nothing
  covers the dispatch path in `http/index.ts`, so nothing records that plugin routes are
  unauthenticated (6.3). Even a passing test asserting "no auth required" would make the
  contract explicit.
- no test that an oversized or slow download is aborted (6.5), and none that a checksum
  mismatch leaves no partial files behind. Still open: the download path is mocked in
  `plugins.test.ts`, so exercising the cap needs a real server serving an oversized body.
- ~~`execution-timeout.test.ts` (58 lines) tests that a slow *async* task rejects. It does
  not, and cannot easily, cover the synchronous-block case (6.6); that deserves the comment
  AGENTS.md requires naming what is not covered and why.~~ the comment is now in
  `execution-timeout.ts` itself, where the limitation lives.

## 7. Server leftovers

Scope: `helpers/**`, the `utils/` files not already covered by chunk 1, `queues/**`,
`crons/**`, `index.ts`, `logger.ts`, `types.ts`. Files already recorded elsewhere
(`get-ws-info.ts` in 1.2, `network.ts` in 1.10, `apply-env-overrides.ts` in 1.9,
`file-manager.ts` in 1.1, `downloads.ts` in 6.4/6.5) are cross-referenced, not repeated.

This closes the server. `index.ts` is clean and its ordering constraint is documented in
place; `voice-move-grants.ts` and `safe-compare.ts` are small and correct. The findings
concentrate in three places: how WebSocket connections are identified, what the message
sanitizer lets through, and a cron that races the upload path.

### HIGH

**7.1 — [FIXED] `utils/wss.ts:149-186` — connections are identified by their JWT string, so a
user with two tabs is half-invisible to the server.** `getOwnWs`, `setWsUserId` and
`getConnectionInfo` all resolve the current socket with
`Array.from(wss.clients).find(client => client.token === token)`. The token is per *user
session*, not per connection, and a second tab reuses it, so `find` returns whichever
socket was accepted first. Consequences:

- `users.kick` and `users.ban` call `ctx.getUserWs(userId)`, also a `find`, and close
  **one** socket. A banned user with two tabs open keeps the other one connected and keeps
  receiving every published event; the ban is only enforced on reconnect
  (`wss.ts:69`). With 1.4 (the JWT is not checked against `banned`) and 3.13, banning is
  substantially weaker than it appears.
- `setWsUserId` (called by `others.join`) can stamp `userId` on the wrong socket, leaving
  the joining connection permanently unattributed: never counted by `getOnlineUserIds`,
  never targeted by `pubsub.publishFor`, and skipped by the `hasOtherSessions` check on
  close.
- `getConnectionInfo` returns the first socket's IP and user agent, so activity logs and
  login records can carry the wrong device.

Fix: assign a unique id to each socket on connect and thread that through the context
instead of the token; make `getUserWs` return **all** matching sockets and have kick/ban
close every one.

Fixed, and no socket ids were needed: **the context already receives its own socket.**
`CreateWSSContextFnOptions` is
`NodeHTTPCreateContextFnOptions<IncomingMessage, ws.WebSocket>`, so the `res` argument
`createContext` was ignoring *is* the connection. The token lookup was not merely fragile,
it was unnecessary.

- `getOwnWs`, `setWsUserId` and `getConnectionInfo` now use that socket directly, so a
  second tab can no longer resolve to the first tab's connection, `setWsUserId` always
  stamps the joining connection, and connection info always describes the right device.
- `getUserWs` returns **all** sockets for a user (`filter`, not `find`) and its type
  changed to `WebSocket[]`. `ban`, `kick` and `delete-user` close every one; `kick` asserts
  on `length > 0`.
- the socket-level `token` bookkeeping is gone with it: nothing read `client.token` any
  more, so the `ws.token` assignment and the `once('message')` handler that existed only to
  parse and record it were removed.

**Correction to the missing-tests note below:** this is *not* assertable in the existing
harness. `setup.ts` starts an HTTP server but never calls `createWsServer`, so `wss` is
undefined throughout the suite and `getUserWs` returns an empty array. Covering it needs a
real WebSocket server plus two connected clients in the harness, which is chunk 13 work.
Added as a manual check instead.

**7.2 — [FIXED] `crons/cleanup-files.ts` deletes files that are still being created.** The job
runs every 15 minutes and removes every row in `files` with no reference from
`message_files`, `users`, `emojis`, `message_reactions` or `settings`. That is exactly the
state a file is in between `fileManager.saveFile` (which inserts the `files` row) and the
statement that links it, and those are separate awaits everywhere:

- `send-message.ts:256-268` loops files, saving and linking one at a time, so on a
  four-file message the first file sits unlinked while the other three are saved and
  optimized;
- `change-avatar.ts:52-62`, `change-banner.ts` and `change-logo.ts:32-38` all save the
  file first and update the owning column afterwards;
- `emojis/add-emoji.ts:29-45` does the same per array element.

If the cron fires inside that window it deletes the row and unlinks the file from disk,
and the request then links a file that no longer exists. Low probability per upload,
certain over time, and it produces exactly the "exists in database but not on disk" error
`public.ts:133` logs.
Fix: exclude recent rows (`createdAt < now - 15 minutes`) from the orphan query. That is
one predicate and it removes the whole class.

Fixed exactly that way, one predicate in `getOrphanedFileIds`. A file missed by one run is
collected by the next, since the cron runs on the same 15 minute interval.

**I also tried applying the same guard to `isFileOrphaned` and reverted it.** That function
is the serve-time check in `http/public.ts`, and two existing tests encode the behaviour
that deleting a message or a channel makes its files stop being downloadable
**immediately**. A grace window there would keep deleted content served for fifteen minutes,
which is worse than the race it would close. The two functions now differ deliberately and
say so in comments: the cron waits, the serve path does not.

Tests: `should delete file inside message when channel is deleted` was asserting cleanup of
a file created milliseconds earlier, so it now ages the row past the window first, which
keeps its actual intent. A new test covers the finding directly, an unlinked brand new file
survives `cleanupFiles`, and it fails without the predicate. This is also the first test to
touch `crons/`.

**7.3 — [FIXED] `helpers/sanitize-html.ts:37-40` — messages can inject arbitrary CSS classes into
every viewer's DOM.** The allowlist permits `class` on `span`, `img`, `code`, `pre` and
`br`. The client parses message HTML with `html-react-parser`
(`channel-view/text/renderer/content-cache.ts`), whose default conversion turns `class`
into `className`, and anything the serializer does not override renders as-is. The app is
built with Tailwind, so the full utility set is present in the bundle: a message
containing `<span class="fixed inset-0 z-50 bg-black">` covers the viewport of every user
who opens that channel, and a more careful one can overlay a convincing fake prompt on top
of the real UI.

This is not XSS: React escapes text and there is no `dangerouslySetInnerHTML` anywhere in
the client (checked). It is persistent UI defacement and a phishing surface, delivered by
an ordinary message, and it survives a reload because the message is stored.
Fix: drop `class` from the allowlist and let the serializer attach the classes the app
needs, or allow only an explicit set of known values (the emoji/mention wrapper classes).

Fixed with the second option, using sanitize-html's own `allowedClasses`, which exists for
exactly this. Establishing the allowed set first mattered: the editor emits only five class
values (`mention`, `channel-reference`, `plugin-command`, `emoji-image`, `hard-break`), and
`emoji-image` is genuinely styled at render time in `index.css`, so dropping `class`
outright would have broken emoji rendering. `code` and `pre` lost `class` entirely, since
this app has no code-block extension and no `language-*` classes to preserve.

Verified against the real sanitizer:

```
<span class="fixed inset-0 z-50 bg-black">gotcha</span>  ->  <span>gotcha</span>
<span class="mention" data-type="mention" ...>@bob</span> ->  unchanged
<span class="emoji-image fixed inset-0">mixed</span>      ->  <span class="emoji-image">mixed</span>
```

The mixed case is the one worth having: an attacker cannot smuggle utilities in alongside a
legitimate class. Three tests added covering all three behaviours.

Not addressed here, and still open as **7.4**: remote `img src` and the missing
`rel="noopener noreferrer"`, both in this same allowlist.

### MED

**7.4 — [FIXED] `helpers/sanitize-html.ts:29,37` — two smaller holes in the same allowlist.**
`img: ['src', …]` with `allowedSchemes: ['http','https']` means any message can embed a
remote image, so posting one makes every member of the channel issue a request to a URL
the sender controls: an IP-address harvester and a read receipt, in a product whose whole
premise is self-hosting. And `a: ['href','target','rel']` allows `target` without forcing
`rel="noopener noreferrer"`, so a link opened in a new tab hands the destination
`window.opener`.
Fix: proxy or restrict `img src` to the server's own `/public` origin, and add
`rel="noopener noreferrer"` via `transformTags` for anchors.

Fixed both halves, the image one narrowed rather than closed.

Anchors: `transformTags` forces `rel="noopener noreferrer"` whenever `target` is present.
The editor already set this on links it creates, so this covers HTML that did not come from
the editor.

Images: `src` is stripped unless it is a relative `/public/...` path, or the host is
`cdn.jsdelivr.net`. Establishing that second entry mattered: the editor has no image
extension, so the only images in messages are emoji, and tiptap's github emoji set falls
back to jsdelivr URLs. Restricting to same-origin, as the finding suggested, would have
rendered every github emoji broken.

**Residual, stated plainly:** custom emoji URLs are built client side against whatever host
the deployment answers on, and the server has no configured public origin to compare
against, so the rule also accepts any absolute URL whose path starts with `/public/`. An
attacker who controls `https://evil.example/public/pixel.png` still gets a hit. Closing that
needs a `server.publicUrl` config value, which is why it was not done here. The image is
kept with its `alt` text when the src is rejected, rather than the whole tag being dropped.

**7.5 — [IGNORED, by your decision] `utils/logins.ts:4-24` — every member's IP is sent to a third party on login.**
`getIpInfo` calls `https://ipinfo.io/<ip>/json` for each new address and stores the result
on the `logins` row. There is no opt-out, no setting, and no mention of it in the server
settings UI. Three further problems in ten lines: no `AbortSignal`, inside a queue with
`concurrency: 1` and a 3s timeout, so one slow response stalls every pending login; no
try/catch, so a non-JSON response throws inside the queue job and the login row is never
written at all; and the private-address check
(`192.168.` / `::1` / `127.0.0.1`) misses `10.x`, `172.16-31.x` and `fc00::/7`, so private
addresses from most real deployments get shipped to ipinfo.io anyway. `helpers/network.ts`
already exports a correct `isPrivateIP` (this is the third copy of that classification,
see 1.24).

**Ignored by your decision.** Nothing changed: the ipinfo.io lookup, the missing
`AbortSignal`, the missing try/catch and the incomplete private-address check all remain as
described.

**7.6 — [FIXED] `logger.ts:42-52` — the log files have no rotation, and they contain access
tokens.** Both `transports.File` are declared without `maxsize`, `maxFiles` or `tailable`,
so `combined.log` grows without bound on the same disk the storage quota is measured
against. At `debug` (the default in development, and any operator who sets
`server.debug`), `http/index.ts:103` logs `req.url` for every request, which includes the
`?accessToken=…&expires=…` query of every signed file URL (1.13 for the related header
gaps). Tokens are valid for their TTL and now sit in a plaintext file forever.
Fix: `maxsize` + `maxFiles` on both transports, and strip the query string from the
request log line.

Fixed both halves: both file transports gained `maxsize` (10MB), `maxFiles` (5) and
`tailable`, and the request log line now logs `req.url.split('?')[0]`, so the `accessToken`
and `expires` of every signed file URL stop being written to a file that is kept.

**7.7 — [FIXED] `queues/activity-log/index.ts:27` — `userId = 1` is the default.** Any
`enqueueActivityLog` call that omits a user is attributed to user 1, which is the seeded
owner. `index.ts:45` logs `SERVER_STARTED` that way, so the audit trail shows the owner
performing actions they did not perform, and there is no way to distinguish a real user-1
action from an unattributed one. Use a nullable `userId` and render it as "system".

Fixed with the nullable column, by decision. `activity_log.user_id` is now nullable
(migration `0021_activity_log_nullable_user.sql`, a table rebuild that copies every row and
recreates all five indexes), and `enqueueActivityLog` defaults `userId` to `null` rather
than `1`. The `ip` lookup was defaulting through the same value, so it now only runs when
there is a user. Entries with no user are the server acting, and no longer appear as the
owner performing actions they never performed.

**7.8 — [LEFT AS IS, by your decision] `utils/wss.ts:73-98` — `hasPermission` re-reads the user and their roles on every
single call.** `getUserById` + `getUserRoles` per invocation, and routes call it two or
three times (`needsPermission`, then an owner-or-permission check, then
`hasChannelPermission` which repeats both). Nothing is memoized for the life of a request.
This is the other half of 2.13: a single `messages.send` runs the same two queries four or
more times.

**Left as is by your decision.** The context is per WebSocket connection rather than per
request, so any memoization either caches for the socket lifetime (a role change would not
apply until reconnect) or needs invalidation plumbing on every role-mutating path. Caching
authorization is where subtle bugs come from, and the queries are indexed and small.

**7.9 — [FIXED] `utils/wss.ts:41-53` — `getOnlineUserIds` walks every connected client to build an
array, and it is called on every publish.** `getAffectedOnlineUserIdsForChannel`
(5.9) then does an `includes` scan against it. Two O(n) passes per published event, per
event. Keep a `Map<userId, Set<socket>>` maintained on connect and close instead; it also
fixes 7.1.

Fixed with the `Map<userId, Set<socket>>` the finding asked for, maintained in
`setWsUserId` and on close. `getOnlineUserIds` is now `Array.from(map.keys())` instead of
walking every client, `getStatusById` is a `has`, and `getUserWs` reads one `Set`. The
`hasOtherSessions` scan in the close handler is gone too: after untracking this socket, the
map itself answers whether the user has another session.

**7.10 — [FIXED] `utils/ip-cache.ts` — unbounded map, one timer per entry, typed `any`.**
`Record<string, any>` (AGENTS.md: avoid `any`), no maximum size, and `set` schedules a
`setTimeout` per IP that is never cleared if the entry is overwritten. Because the key is
the client-controlled forwarded IP (1.2), an attacker can create unbounded entries and
unbounded pending timers with spoofed headers. The rate limiter next door already solved
this with `maxEntries` and a gc.

Fixed all three parts: a `Map<string, { data, expiresAt }>` typed with `TIpInfo` instead of
`Record<string, any>`, a `MAX_ENTRIES` cap of 10k with oldest-first eviction, and the
per-entry `setTimeout` replaced by a sweep on write. That timer was the sharp edge, since it
was never cleared when an entry was overwritten and the key is the client-controlled
forwarded IP.

**7.11 — [FIXED, as documentation] the queues do not do what their timeout implies.** All three use
`new Queue({ timeout: 3000 })`, which abandons the job's callback but does not cancel the
work; a slow insert still lands after the queue has moved on. Combined with
`concurrency: 1` on the logins queue and a network call inside it (7.5), a single slow
external response delays every login record behind it. Nothing is persisted either, so a
crash loses queued activity logs and logins silently. That may be acceptable for this
data, but it should be a stated choice rather than an accident of the default options.

Fixed as the finding asked, by making it a stated choice rather than a mechanism: all three
queues now carry a comment recording that `timeout` abandons the job's callback without
cancelling the work, and that nothing is persisted so a crash loses whatever is queued. Both
are accepted for diagnostic data. No behaviour changed.

### LOW

**7.12 — `helpers/clear-fields.ts` redacts by substitution, not removal.**
`getDefaultValue` replaces a cleared field with `''`, `-1`, `false` or `{}` depending on
its type, so `users.getAll` returns `identity: ''` and `password: ''` rather than omitting
them, and every client type still declares the field. The `-1` case is the sharp edge: a
redacted numeric field becomes a plausible-looking id that downstream code will treat as
real. The function is also named for removal, which is not what it does.

**7.13 — three test hooks live in production modules.**
`utils/rate-limiters/rate-limiter.ts:23` (`clearRateLimitersForTests`),
`helpers/voice-move-grants.ts:27` (`clearVoiceMoveGrantsForTests`) and
`utils/rate-limiters/index.ts:38` (`globalThis.disableRateLimiting`). Individually
harmless, collectively a pattern worth a decision: either accept it and name it
consistently, or move the reset behind the test harness.

**7.14 — `crons/index.ts:135` hardcodes `'Europe/Lisbon'`.** Harmless for a 15-minute
interval, and wrong for any cron that ever needs to run at a specific local hour. It is
the maintainer's timezone baked into a self-hosted product.

**7.15 — `helpers/deep-merge.ts:114` iterates keys from a parsed config file with no key
guard.** `config.ts` feeds it the output of `ini.parse()` on an operator-editable file.
The blast radius is small (the file is admin-owned, and `zConfig.parse` runs after), but
`__proto__` and `constructor` deserve an explicit skip in a generic merge helper.

**7.16 — `utils/updater.ts:118` — `setInterval` is never cleared and every failure is
swallowed into one log line.** An operator who enables `server.autoupdate` and whose
update checks start failing gets a server that silently never updates.

**7.17 — `utils/embeds.ts:37` — the development branch copies migrations without
pruning.** `fs.cp(SRC_MIGRATIONS_PATH, DRIZZLE_PATH, { recursive: true })` never removes
files, so a migration deleted or renamed in `src` lingers in the working directory and
keeps being applied locally.

**7.18 — the `helpers/` versus `utils/` boundary has drifted.** AGENTS.md defines
`helpers/` as domain-aware and `utils/` as infrastructure with no domain knowledge. In
`utils/` today: `file-manager.ts` (storage quotas, per-user limits, plugin hooks),
`logins.ts` (login records), `embeds.ts` (knows about interface, migrations and mediasoup
paths), `updater.ts`. Meanwhile `helpers/` holds `zip.ts`, `fs.ts`, `deep-merge.ts` and
`sha-256-file.ts`, which are pure infrastructure. The two folders are roughly swapped at
the edges.

**7.19 — `helpers/__tests__/pasre-command-args.test.ts` is misspelled** ("pasre").

### Missing tests

`helpers/__tests__` covers six helpers including `sanitize-html` and `get-ws-info`, which
are the right two to have covered. The gaps:

- ~~nothing covers `crons/` at all, so the orphan-cleanup race (7.2) has no test.~~ added
  with 7.2, in `http/__tests__/public.test.ts` where the file fixtures already live.
- nothing covers `utils/wss.ts`, so the socket-identity behaviour (7.1) is entirely
  unverified. **Not** assertable with the existing harness after all: the suite never
  starts a WebSocket server, so `wss` is undefined and there are no clients to find.
  Standing one up is chunk 13 work.
- ~~`sanitize-html.test.ts` exists but has no case for the `class` attribute (7.3)~~ added
  with 7.3. The `img src` off-origin case (7.4) is still uncovered.
- no tests for `queues/activity-log` or `queues/logins`. The `userId = 1` default (7.7) is
  gone, but neither queue has direct coverage, and the swallowed `getIpInfo` failure (7.5)
  stays undocumented since that finding was ignored.
- `utils/__tests__` has three files (`file-manager`, `metrics`, `rate-limiter`); nothing
  covers `pubsub.ts`, which is the delivery path for every realtime event in the product.

## 8. Client state

Scope: `apps/client/src/features/**` (56 files, ~6200 lines): the `app`, `dialogs`,
`server-screens` and `server` slices, the eight `server/*` domains and `store.ts`.

Context that applies to this chunk and the next four: **the client has no tests.** There
are no `*.test.ts*` files anywhere under `apps/client`, and `package.json` has no `test`
script (`dev`, `build`, `lint`, `check-types`, `format`, `magic`). Everything below is
therefore unverified by anything except the type checker, and the "Missing tests" section
is the same sentence for every client chunk, so it is stated once here and referenced
later. `packages/e2e` is the only automated coverage of client behaviour and it is
reviewed in chunk 13.

The cross-domain selector file (`server/selectors.ts`) is otherwise exactly what AGENTS.md
prescribes: shared selectors live there, `canViewChannel` is reused from `helpers.ts`
rather than re-implemented, and the parameterized selectors are keyed with
`createCachedSelector`. The findings are concentrated in four selectors that are not, and
in the shape of the store.

### HIGH

**8.1 — [FIXED, and the finding is CORRECTED] the two selector anti-patterns AGENTS.md names by name are still present, and
there are two more of the same kind.** AGENTS.md says: "Never wrap a parameterized
selector in a plain `createSelector` … (`userStatusSelector` and `userRolesSelector` are
the existing offenders, don't copy them)". Both are unchanged, and the pattern spread:

- `server/selectors.ts:138` `userRolesSelector` — `createSelector([rolesSelector,
  userByIdSelector], …)` returning **a new array**. This is the damaging variant: the
  outer selector has a cache of one, so two components asking for different `userId`s
  evict each other and every call returns a fresh array reference. It is exposed as
  `useUserRoles` (`server/hooks.ts:115`), which the member list calls once per row, so
  every row re-renders on **every store dispatch** regardless of relevance.
- `server/selectors.ts:145` `userRolesIdsSelector` — same wrapper, and its fallback
  `user?.roleIds || []` allocates a new empty array on every call for any user with no
  roles (AGENTS.md: use the module-level `DEFAULT_ARRAY`).
- `server/selectors.ts:191` `voiceUsersByChannelIdSelector` — a plain `createSelector`
  over `voiceChannelStateSelector`, which is parameterized by channel id, building a new
  array. Two voice channels rendered at once thrash the cache permanently.
  `ownVoiceUserSelector` (line 214) then calls it from inside an inline input function,
  so it inherits the thrash.
- `users/selectors.ts:67` `userStatusSelector` — the primitive-returning variant named in
  AGENTS.md. Cheapest of the four (a primitive result means no re-render, only
  recomputation), and still wrong.

Fix: `createCachedSelector` keyed by the same parameter for all four, and
`DEFAULT_ARRAY` for the empty fallbacks. This is the highest-value change in the client:
it is four small edits against a documented rule, and one of them is a per-row re-render
in the most-rendered list in the app.

**Correction: the premise is out of date, and so is the rule in AGENTS.md.** This project
is on `@reduxjs/toolkit` 2.11.2, which brings `reselect` **5.1.1**. Reselect 5 changed the
default memoization from `defaultMemoize`, a single slot, to `weakMapMemoize`, which caches
per unique combination of inputs. Measured against the installed versions, with a new state
object per dispatch, which is what redux actually produces:

```
plain createSelector wrapping a parameterized selector
  same result reference across dispatches, single key:       true
  same result reference across dispatches, interleaved keys: true
```

So two components asking for different ids do **not** evict each other, and the headline
consequence of this finding, every row of the member list re-rendering on every dispatch,
does not happen on this version. The described behaviour is real for reselect 4.

Fixed anyway, but the value is different from what the finding claimed. All four selectors
now use `createCachedSelector` keyed by their parameter, and the empty cases return
module-level constants (`DEFAULT_ROLES`, `DEFAULT_ROLE_IDS`, `DEFAULT_VOICE_USERS`) rather
than fresh arrays. What that buys: consistency with the documented rule, explicit keying
that does not depend on a library default, and fewer allocations. What it does not buy: a
re-render fix, because there was not one to make.

Verified by running the real selector module against a synthetic store before and after,
since the client has no test harness to put this in.

`userRolesIdsSelector` has **no consumers anywhere in the client**. It was fixed rather
than deleted, pending a decision.

**AGENTS.md's selector section needs revisiting** as part of this: it names
`userStatusSelector` and `userRolesSelector` as offenders and states the cache-of-one
behaviour as fact. Both statements are now wrong for the installed reselect, and the guide
is what a contributor reads first. See T3.

### MED

**8.2 — [PARTLY FIXED, by decision] `server/slice.ts:194-213` — `messagesMap` grows without bound and pays for it on
every incoming message.** `addMessages` builds `new Set(existing.map(m => m.id))` over the
channel's entire loaded history before merging, so a channel with 10,000 messages scrolled
into memory rebuilds a 10,000-element Set for each arriving message. Nothing ever evicts:
messages accumulate per channel for the lifetime of the session, across every channel
visited, and switching away does not release them. This is the client-side mirror of 2.3
and 2.4 (unbounded server pages feeding an unbounded client store).
Fix: cap the retained window per channel (drop to the last N on channel switch), and keep
an id `Set` per channel in state rather than rebuilding it.

Fixed the per-message cost, left the retention alone, by decision. The dedupe set is now
built from the **incoming** batch (usually one message) instead of the channel's whole
loaded history, and the scan over `existing` stops early once every incoming id has been
accounted for. Existing entries still win on a collision, so semantics are unchanged.

**Not fixed:** `messagesMap` still grows for the session and nothing evicts. Capping it was
rejected because a channel scrolled deep into, then left and returned to, would refetch, and
scroll restore beyond the cap would break. The growth is bounded by what the user actually
scrolled through.

**8.3 — [FIXED] `users` is stored as an array, and everything looks users up linearly.**
`IServerState.users: TJoinedPublicUser[]` (`slice.ts:46`). `userByIdSelector` does a
`find` per user id; `voiceUsersByChannelIdSelector` and both typing selectors do
`users.find(...)` **inside** a `map`, which is O(users x participants) each time a voice
participant list or typing indicator re-renders. A `usersMapSelector` does not exist,
although `channelsMapSelector` (`channels/selectors.ts:182`) and `usernamesSelector`
(`users/selectors.ts:72`) show the pattern is already understood in this codebase.
Fix: one `usersMapSelector`, composed by the selectors above.

Fixed: `usersMapSelector` added in `users/selectors.ts` (an id keyed record, the same shape
`usernamesSelector` and `channelsMapSelector` already use), and the typing and voice
selectors now index into it instead of running `users.find` inside a `map`.

**8.4 — [FIXED as documentation, by decision] one 871-line slice holds eight domains, which is not the documented
structure.** AGENTS.md: "`features/` — Redux Toolkit state, split by domain, each with the
same four files: `slice.ts`, `actions.ts`, `selectors.ts`, `hooks.ts`". In practice the
`server/*` domains have `actions.ts`, `selectors.ts`, `hooks.ts` and `subscriptions.ts`
but **no** `slice.ts`; all ~60 reducers for messages, users, roles, channels, emojis,
categories, voice, typing and settings live in `server/slice.ts`. Every domain edit
touches the same file. Either split it (one `createSlice` per domain, combined in
`store.ts`) or update AGENTS.md to describe what actually exists; right now the guide
sends a new contributor to a file that is not there.

Fixed by amending the guide, by decision. `AGENTS.md` now describes the structure that
exists: top level slices own a `slice.ts`, while the `server/*` domains have none and their
reducers all live in `features/server/slice.ts`, with the domain folder holding
`actions.ts`, `selectors.ts`, `hooks.ts` and `subscriptions.ts`. It also states that a
service holding no state belongs in `helpers/` or `lib/`, which is the rule 8.7 broke.

**The 871-line slice is unchanged.** Splitting it per domain is the alternative and was not
taken: it is a large mechanical refactor across a codebase with no tests to catch a mistake.

**8.5 — [FIXED] `server/actions.ts:160-166` — `markChannelAsRead` catches nothing.**

```
try {
  trpc.channels.markAsRead.mutate({ channelId });
} catch {
  // ignore errors
}
```

The mutation is not awaited, so the `try` block exits before the promise settles and a
rejection becomes an unhandled promise rejection rather than the intended no-op. The
optimistic `setChannelReadState({ count: 0 })` above it is also never rolled back, so a
failed mark-as-read leaves the channel showing as read until the next refresh.

Fixed both halves: the mutation is awaited so the `try` block actually covers it (an
unawaited rejection was becoming an unhandled promise rejection rather than the intended
no-op), and the optimistic zero is rolled back to the previous unread count on failure. The
function is now `async`; every caller is fire and forget and stays correct, since the catch
means it never rejects.

**8.6 — [LEFT AS IS, by decision] `server/actions.ts:167-178` — ownership is claimed through a global on
`window`.** `window.useToken = async (token) => trpc.others.useSecretToken.mutate(...)`,
with `window.openSoundsModal` beside it. There is no UI for it, so the documented path to
becoming the server owner is "open devtools and call a global". Any script that runs in
the page (a malicious browser extension, a compromised dependency, anything that ever
achieves script execution) can call it with a guessed or captured token, and 4.5 records
that the endpoint has no rate limit and no audit log entry.

**Left as is, by decision.** `window.useToken` remains the only path to claiming ownership,
so removing it needs a replacement UI, which is a feature rather than an audit fix. Recorded
so it is not mistaken for an oversight: any script running in the page can call it, and
4.5 has since rate limited that endpoint, added an already-owner check and given it an
activity log entry, so the endpoint behind the global is no longer unguarded.

**8.7 — [FIXED] `server/sounds/actions.ts` is a 523-line Web Audio service inside the state
folder.** It manages `AudioContext` lifecycle, resume-on-gesture and playback. It holds no
Redux state, has no `slice.ts`, `selectors.ts` or `hooks.ts` beside it, and is the only
file in its domain folder. `features/` is for state; this belongs in `lib/` or
`helpers/`.

Fixed: moved to `helpers/sounds.ts` and all eight import sites updated. It holds no Redux
state, so `features/` was the wrong folder, and the rule it broke is now written down in
AGENTS.md with 8.4.

**8.8 — [FIXED] `server/selectors.ts:74-113` — two selectors compute the same thing twice.**
`hasVisibleChannelsInCategorySelector` is `visibleChannelsInCategorySelector` with `.some`
instead of `.filter`, over identical inputs and the same cache key. The sidebar renders
both for every category, so each category filters its channel list twice per render pass.
The first can be `visibleChannelsInCategorySelector(state, id).length > 0`, reusing the
memoized array.

Fixed: `hasVisibleChannelsInCategorySelector` is now a plain function returning
`visibleChannelsInCategorySelector(state, categoryId).length > 0`, so the sidebar filters
each category's channels once per render pass instead of twice. Verified that it reuses the
memoized array rather than recomputing.

**8.9 — [FIXED] `server/selectors.ts:149,178` — `typingUsersByChannelIdSelector` and
`typingUsersByThreadIdSelector` are the same eight lines twice**, differing only in which
map they read and their cache key prefix. One selector parameterized by
`(map, key)` covers both, and it would fix the O(n x m) `find`-inside-`map` (8.3) once
instead of twice.

Fixed: one `createTypingUsersSelector(map, keyPrefix)` factory builds both, so the eight
duplicated lines exist once. Each call produces its own `createCachedSelector` instance, so
the channel and thread caches stay independent (verified). Resolving users through
`usersMapSelector` fixed 8.3 here at the same time, in one place instead of two.

**8.10 — [FIXED] subscription failures are invisible.** Every handler in the five
`subscriptions.ts` files ends with `onError: (err) => console.error(...)`. tRPC's ws link
reconnects, but if a subscription ends up dropped the user sees a UI that silently stops
updating with no indication. At minimum, surface a reconnecting state the way the
`connected` / `connecting` flags in the slice already allow.

Fixed by routing through the existing flag, by decision. `handleSubscriptionError(name)` in
`features/server/subscription-error.ts` logs and dispatches `setConnected(false)`, and all
**34** handlers across the eight `subscriptions.ts` files now use it. Whatever already
renders a disconnected state now covers a dropped subscription too, rather than the UI
silently going stale. The ws link still reconnects on its own and `joinServer` sets the flag
back.

### LOW

**8.11 — `ownUserSelector` (`users/selectors.ts:47`) and `ownPublicUserSelector`
(line 62) are identical.** Same inputs, same body, two exported names, both used.

**8.12 — `slice.ts:198` — `addMessages` declares `opts?: { prepend?: boolean }` and never
reads it.** The payload type advertises an ordering option the reducer does not implement;
`mergeMessagesChronologically` always decides. Callers pass `{}` (see
`messages/subscriptions.ts:18`).

**8.13 — `channelByIdSelector` re-scans instead of composing.**
`channels/selectors.ts:119` does `channels.find(...)` while `channelsMapSelector` (line
182) already builds the id map. AGENTS.md: compose selectors, do not re-derive.

**8.14 — `server/selectors.ts:165` — `hasSharingScreenUsersSelector` takes a `channelId`
its result function ignores.** The parameter only feeds the cache key; the actual
channel scoping happens inside `voiceChannelStateSelector`. It works, and it reads as a
bug every time someone opens the file.

**8.15 — [FIXED with 8.4] `subscriptions.ts` is a fifth file type the guide does not mention.** Eight
domains have one, they are consistent and well-shaped, and AGENTS.md's "same four files"
rule does not account for them. Documentation drift, same root as 8.4.

Fixed with 8.4: `subscriptions.ts` is now named in the guide as part of a domain folder.

### Missing tests

There are none, for any of this. See the note at the top of this chunk: the client has no
test files and no `test` script. The four selectors in 8.1 are the clearest example of
what that costs, since a single render-count assertion would have caught the pattern the
guide already warns about.

## 9. Client voice

Scope: `components/voice-provider/**` (12 files, 1311 of them in `index.tsx`),
`components/devices-provider/**`, `src/audio-worklets/*.js` and
`src/helpers/audio-worklet/*.ts`. No tests, per the note in chunk 8.

The worklet layer is thoughtfully built (blob caching through the Cache API, availability
probes, graceful degradation when a processor fails to load) and the noise-gate processor
itself is clean. The findings are about resource lifetime: two paths release the
microphone only under some conditions, and one piece of debug instrumentation re-renders
the entire call UI once a second.

### HIGH

**9.1 — [FIXED] `voice-provider/index.tsx:1237-1290` — transport stats are in the context value,
so every voice component re-renders once per second for the whole call.**
`use-transport-stats.ts:471` runs `collectStats` on a 1000 ms `setInterval` for the
duration of a call, calling `getStats()` on the producer transport, the consumer transport
and the screen-share producer, then `setStats(...)`. `transportStats` is a member of
`contextValue` and a dependency of its `useMemo`, so a new context object is published
every second and **every consumer of `VoiceProviderContext` re-renders**: the video grid,
every participant tile, the controls bar, the floating pinned card.

The only consumers of the data are `StatsPopover` (`left-sidebar/voice-control.tsx:23`),
which is closed almost all the time, and the `window.printVoiceStats` debug global. So the
most expensive recurring work in the client exists to feed a popover nobody has open.
Fix: move stats into their own context (or a subscription the popover opts into), and only
start the interval while a consumer is mounted.

**Correction to the finding:** there is a third consumer. Besides `StatsPopover` and the
`window.printVoiceStats` global, `channel-view/voice/screen-share-card.tsx` reads
`transportStats.screenShare?.codec` to label the stream. So the data is not purely
debug-only, though the codec it needs changes rarely.

Fixed by separating the context, by decision. `voice-provider/stats-context.tsx` holds a
`VoiceStatsContext` and a `useVoiceStats()` hook; `VoiceProvider` renders it inside the main
provider, and `transportStats` is gone from `TVoiceProvider`, from the default context value
and from the `contextValue` memo and its dependency list. Both component consumers now call
`useVoiceStats()`.

So a stats tick republishes only the stats context. The video grid, participant tiles,
controls bar and floating card no longer re-render once a second for the length of a call.
Verified by asserting against the source that `contextValue` no longer mentions
`transportStats`, that the type no longer declares it, and that the stats provider actually
wraps the children.

**Still open as 9.10:** the interval itself runs unconditionally for the whole call, so the
`getStats()` work on three transports every second remains whether or not anything is
displaying it. Only the re-render cost was removed here.

**9.2 — [FIXED] `voice-provider/index.tsx:555` — the microphone is only released when the noise
gate is active.** `rawMicrophoneStreamRef.current = rawStream` is assigned in exactly one
place: inside the `if (processedTrack)` success branch of the noise-gate setup.
`cleanupMicProcessingResources` (line 436) stops `rawMicrophoneStreamRef` and
`transmitMicrophoneTrackRef`. With noise suppression enabled (DTLN or RNNoise) and the
noise gate off or unavailable, `transmitMicrophoneTrackRef` holds the **chain's output
track**, not the raw device track, and `rawMicrophoneStreamRef` was never set. Nothing
stops the real microphone track.

The consequence is the one users notice immediately: after leaving a voice channel the
browser's "microphone in use" indicator stays lit and the device stays captured until the
tab is closed. Fix: assign `rawMicrophoneStreamRef.current = rawStream` immediately after
`getUserMedia` returns, before any branching.

Fixed with the one line the finding identified, moved: `rawMicrophoneStreamRef.current =
rawStream` now runs immediately after `getUserMedia` returns, before any branching, and the
assignment inside the noise-gate success branch is removed as redundant. `cleanup` stops
whatever that ref points at, so the real device track is now released whatever combination
of noise suppression and noise gate is in use.

This is the user-visible one: the browser's microphone indicator stayed lit after leaving a
call, with the device still captured, until the tab was closed.

**9.3 — [FIXED] `voice-provider/index.tsx:1145-1155` — a failed join leaves the microphone
live.** `init` runs `cleanup()` at the start, then creates transports, consumes existing
producers and calls `startMicStream()`. Its `catch` sets `ConnectionStatus.FAILED`, clears
loading and rethrows: it does **not** call `cleanup()`. So a failure after
`startMicStream` has succeeded (for example `startMonitoring` throwing, or a later step in
a future edit) leaves the mic captured, the audio producer created and both transports
open, while the UI reports a failed connection. Those resources are only reclaimed when
the next `init` runs its opening `cleanup()`, which may be never.
Fix: `cleanup()` in the `catch` before rethrowing.

Fixed: `init`'s `catch` calls `cleanup()` before rethrowing, so a failure part way through
no longer leaves the microphone captured, the audio producer created and both transports
open while the UI reports a failed connection. `cleanup` was already in the callback's
dependency list, so nothing else changed.

### MED

**9.4 — [DEFERRED, see T4] `voice-provider/index.tsx` is 1311 lines in a single component.** AGENTS.md: break
up components over 200 lines. It holds ~30 hooks, four stream-acquisition routines
(`startMicStream` is itself ~200 lines with 11 dependencies), quality-layer bookkeeping,
the refs map, the controls bridge and the context assembly. The `hooks/` folder next to it
shows the intended decomposition already exists; mic, webcam and screen-share acquisition
are the obvious next three extractions, and 9.1, 9.2 and 9.3 are all consequences of the
size.

Deferred by decision, recorded as **T4**. The three HIGH findings blamed on the file's size
are already fixed without touching its structure, so the remaining argument for splitting it
is maintainability rather than correctness, and it is a multi-file refactor with no tests to
catch a mistake.

**9.5 — [FIXED with 9.6] `helpers/audio-worklet/dtln-worklet.ts:47` and `rnnoise-worklet.ts:44` — a
strong-keyed `Map<BaseAudioContext, Promise<void>>` that is never cleared.** Every
`startMicStream` builds new `AudioContext` instances; each one becomes a permanent key, so
closed contexts can never be garbage collected and the map grows for the lifetime of the
tab. `WeakMap` is the whole fix.

Fixed as part of 9.6: the shared loader keys its load promises in a `WeakMap`, so a closed
`AudioContext` can be collected. Note `noise-gate-worklet.ts` and `audio-meter-worklet.ts`
already used a `WeakMap`; only the DTLN and RNNoise copies leaked, which is what the finding
said.

**9.6 — [FIXED] `dtln-worklet.ts` and `rnnoise-worklet.ts` are the same file twice, and they have
drifted.** Both implement: a module-level blob-url promise, Cache API population, a
context-keyed load-promise map, a `waitForReady` timeout and the chain builder. The
differences are the drift: DTLN has a `DTLN_CACHE_ENABLED` flag and cache name `v3`,
RNNoise has no flag and `v1`, so cache invalidation behaves differently for the two
processors. `noise-gate-worklet.ts:100` and `audio-meter-worklet.ts:40` then repeat the
load-promise pattern a third and fourth time in a simpler form.
Fix: one `createWorkletLoader({ url, name, cacheName })` covering all four.

Fixed by unifying all four, by decision. `helpers/audio-worklet/create-worklet-loader.ts`
holds `createWorkletLoader({ url, cacheName, errorLabel })`, covering the blob-url promise,
optional Cache API population, the per-context load promise and the support check. DTLN,
RNNoise, noise-gate and audio-meter all use it.

Each keeps its existing cache name (`dtln-worklet-v3`, `rnnoise-worklet-v1`), so nothing
users already have cached is orphaned. The drift is gone in the sense that both now take the
same code path: the DTLN-only `DTLN_CACHE_ENABLED` flag became "pass a `cacheName` or do
not", and the two `?url` loaders simply pass no cache name.

One behaviour change worth knowing: the four files had **two different** support checks. The
noise-gate and audio-meter versions also verified `'audioWorklet' in AudioContext.prototype`,
which the DTLN and RNNoise versions did not. The shared helper uses the stricter one, so
DTLN and RNNoise now correctly report unsupported on a browser that has the constructors but
no `audioWorklet`.

The four files went from 453 lines to 430 including the new shared file, which is a smaller
saving than it looks because most of what was removed was duplicated logic rather than
lines.

**9.7 — [FIXED] `voice-provider/index.tsx:1213` — a ref is read during render and passed as a
hook argument.** `useVoiceEvents({ …, rtpCapabilities: deviceRtpCapabilities.current })`.
Refs do not trigger renders, so the hook receives whatever the value was at the last
render. It happens to work because `init` calls `setLoading` and `setConnectionStatus`
right after assigning the ref, forcing a re-render that re-passes the new value. Remove
either of those state updates and the voice event handlers silently keep a `null`
capability set.

Fixed by passing the ref rather than its value: `useVoiceEvents` now takes
`rtpCapabilitiesRef` and reads `.current` at the point of use, inside the event handler, so
it no longer depends on a re-render happening to re-pass the value. The handler returns
early if capabilities are still absent.

**9.8 — [FIXED] `voice-provider/index.tsx:615` — the audio producer is created through an optional
chain.** `localAudioProducer.current = await producerTransport.current?.produce({...})`.
If the transport is missing, `produce` is skipped, `localAudioProducer.current` becomes
`undefined`, and execution continues past it: `setLocalAudioStream(transmitStream)` has
already run, so the UI shows the user as live and unmuted while nothing is being
transmitted. An `invariant` on the transport would turn a silent failure into an error.

Fixed: the transport is asserted before `produce` is called, so a missing transport throws
into the existing catch instead of silently leaving `localAudioProducer.current` undefined
while `setLocalAudioStream` had already told the UI the user was live.

**9.9 — [FIXED] `devices-provider/index.tsx:137-170` — `loadDevices` has `try`/`finally` and no
`catch`, and is called without `await` from an effect.** If `enumerateDevices()` rejects
(permissions policy, an insecure context) the rejection is unhandled, the three device
lists stay empty, and the user gets an empty device picker with no explanation. Same class
of mistake as 8.5.

Fixed: `loadDevices` has a `catch` that logs and shows a toast, and the string
`failedLoadDevices` was added to all seven locales. `finally` still sets `devicesEnumerated`,
so the UI does not hang waiting for enumeration that failed.

**9.10 — [FIXED] stats polling runs unconditionally.** Separate from 9.1's re-render cost:
`getStats()` on three transports every second for the entire call is real CPU and, on
laptops, real battery, whether or not anything displays it.

Fixed with ref counting, by decision. `useTransportStats` exposes `subscribe()`, and
`useVoiceStats()` calls it in an effect, so `collectStats` only runs while the stats popover
or the screen-share card is mounted. `startMonitoring` still records the transports and the
interval, it just does not start polling until something is listening.

Verified by extracting the gate logic and driving it: no polling with no consumer, one
interval for two consumers, polling resumes when a consumer returns, and it stops when the
call ends.

Consequence to be aware of: with nothing mounted the totals stop advancing, so the popover's
first paint after opening shows counters that resume rather than reflecting the whole call,
and `window.printVoiceStats` reports stale numbers unless a consumer is mounted.

**9.11 — [FIXED, with a correction] `voice-provider/index.tsx:630` — the code listens for `'@close'`, a
mediasoup-client internal event.** The `@` prefix marks private events in that library;
using one as public API means a patch release can silently stop the
`voice.closeProducer` mutation from ever firing, leaving orphaned server-side producers
(which 4.4 already shows are never cleaned up). Use the documented
`transportclose`/`trackended` events.

**Correction: the fix the finding proposed is not equivalent.** Reading mediasoup-client
3.18.7: `producer.close()` emits `'@close'` (private, consumed by the transport) and
`observer.safeEmit('close')`; `producer.transportClosed()` emits `'transportclose'` and also
`observer.safeEmit('close')`. So `transportclose` fires on a *different* trigger than
`'@close'`, and swapping to it would have stopped the cleanup mutation firing on an ordinary
local close, which is the case that matters.

Fixed with the actual public equivalent: `producer.observer.on('close', ...)`, at all four
call sites. It covers local close exactly as before, and additionally fires when the
transport closes, so `voice.closeProducer` is now also called during teardown. Given 4.4,
where server-side producers are never cleaned up, that extra firing is a gain rather than a
regression.

`use-transports.ts:297` still lists `'@close'` among consumer cleanup events, behind a
`@ts-expect-error`. Left alone: it fires the same handler as the three public events beside
it, so a rename there is a no-op rather than a bug.

### LOW

**9.12 — `use-transport-stats.ts:541` adds `window.printVoiceStats`.** Third debug global
on `window` after `window.useToken` and `window.openSoundsModal` (8.6). At least this one
is removed on unmount. Worth collecting all three behind one namespaced debug object that
is stripped from production builds.

**9.13 — `devices-provider/index.tsx:137` assigns a ref during render**
(`devicesRef.current = devices`). Common pattern, technically a render-phase side effect,
and it can retain a value from a render that was never committed under concurrent
rendering.

**9.14 — `src/audio-worklets/*.js` are plain JavaScript outside the type-checked
build.** They are loaded by URL (`?url` imports) so they cannot be bundled as TS, which is
a legitimate constraint, but it means the two processors that run on every microphone
frame have no type checking and no lint coverage, and the message-protocol contract
between `noise-gate-processor.js` and `noise-gate-worklet.ts` is maintained by hand on
both sides.

**9.15 — `startMicStream` is a ~200-line `useCallback` with 11 dependencies.** Any change
to a device setting re-creates it, which re-creates `init` (which depends on it), which
re-creates `contextValue`. Part of 9.4, listed separately because it is the specific
callback worth extracting first.

### Missing tests

None exist (chunk 8). The three HIGH findings here are all lifecycle bugs that a
component test with a mocked `getUserMedia` would catch directly: leave a channel and
assert every track is stopped (9.2), fail a step of `init` and assert the same (9.3), and
assert that a stats tick does not change the context identity (9.1).

## 10. Client channel view & editor

Scope: `components/channel-view/**` (67 files), `components/tiptap-input/**` (17),
`components/message-compose/**`, `components/thread-sidebar/**`. 91 files, ~8900 lines.
No tests, per chunk 8.

Structurally this is the healthiest part of the client: files are small, the folder layout
matches AGENTS.md (`index.tsx` plus local parts, `hooks/`, `helpers.ts`), and
`thread-compose.tsx` correctly **reuses** `MessageCompose` rather than copying it, which
is the one place duplication would have been most tempting. The renderer's parse and media
caches are bounded. No CRIT or HIGH findings.

### MED

**10.1 — [FIXED with 2.2] nothing limited message length on this side either.** `tiptap-input` registers no
`CharacterCount` extension and no `maxLength`; `message-compose/index.tsx:161`
`handleSend` checks `isEmptyMessage`, file count and a send-in-flight flag, and nothing
else. With 2.2 (no `.max()` on the server's `content` field) there is no bound anywhere in
the product: the editor will happily accept a pasted multi-megabyte document, send it, and
every client in the channel will store, parse and render it. The single shared
`MESSAGE_MAX_LENGTH` proposed in 2.2 should be enforced here as a `CharacterCount` limit
so the user sees the cap instead of an error after the fact.

**10.2 — [CORRECTED, downgraded to LOW] attachment truncation is not silent on the
client.** The original finding read `message-compose/index.tsx:174` (`files.slice(0,
maxFilesPerMessage)`) as a silent client-side truncation mirroring the server's 2.9. It is
not: `hooks/use-upload-files.ts:61` `takeAllowedFiles` enforces the limit **at attach
time**, refuses files past the remaining slots, and toasts the user with the number
discarded ("N files were ignored due to the per-message attachment limit"). The `slice` in
`handleSend` is a redundant second guard that cannot trigger.

What remains is LOW: the duplicate guard is dead code, and the two warnings in
`takeAllowedFiles` are hardcoded English (counted in 11.3). The server's silent truncation
(2.9) still stands, but as defence in depth against a non-standard client rather than a
user-facing bug.

**10.3 — [FIXED] `channel-view/text/hooks/use-scroll-controller.ts:73-102` — the initial scroll is
a four-shot guess with no cleanup.** The effect calls `performScroll()` immediately, then
again in `requestAnimationFrame`, then at 50 ms, then at 200 ms, and neither timeout is
cleared on unmount or when the dependencies change. Switching channels within 200 ms
leaves pending callbacks that run against the new channel's container and jump the user to
the bottom of a conversation they had scrolled up in. The auto-scroll effect at line 120
adds a fifth uncleaned `setTimeout(…, 10)`, and it depends on the `messages` array
identity, which 8.2 recreates on every arriving message.
Fix: clear the timers in the effect's cleanup, and replace the guessing with a
`ResizeObserver` on the content or a bottom sentinel with `scrollIntoView`.

Fixed: the four-shot guess is replaced by one immediate scroll plus a `ResizeObserver` on
the container that re-applies the position while content is still growing, disconnected
after a second. Both it and its stop timer are cleared in the effect's cleanup, and the
auto-scroll effect's `setTimeout` is cleared too. Switching channels mid-scroll can no
longer land a pending callback on the new channel's container.

**10.4 — [FIXED] the thread copy of the send flow has drifted from the channel copy.**
`channel-view/text/index.tsx:132` and `thread-sidebar/thread-compose.tsx:80` implement the
same `onSend`. The channel version reports failures with
`getTrpcError(error, t('failedSendMessage'))`; the thread version uses
`getTrpcError(error, 'Failed to send reply')` — a hardcoded English string, against
AGENTS.md's explicit rule that toast messages in `catch` blocks go through i18n. The
throttled `sendTypingSignal` above it is also duplicated verbatim in both files. Two
copies, and the newer one already lost the translation.

Fixed both halves. `hooks/use-typing-signal.ts` holds the throttled signal, parameterised by
`parentMessageId`, and both the channel and thread call sites use it, so the duplicated
`useMemo`/`throttle` block exists once. The hardcoded `'Failed to send reply'` became
`t('failedSendReply')`, with the string added to all seven locales.

**10.5 — [FIXED] `try`/`catch` around promises that are never awaited, third and fourth
instances.** `message-compose/index.tsx:210-216` wraps
`trpc.files.deleteTemporary.mutate(...)` in a `try` with an `// ignore error` comment, but
the call is not awaited, so the block exits before the promise settles and a rejection
becomes an unhandled rejection instead of being ignored. Same shape as 8.5
(`markChannelAsRead`) and 9.9 (`loadDevices`). Four sites now, one idiom: either `await`
inside the `try`, or attach `.catch(() => {})`.

Fixed: `trpc.files.deleteTemporary.mutate(...).catch(() => {})`, awaited, so a rejection is
actually swallowed rather than becoming an unhandled rejection. This was the fourth site of
the idiom, after 8.5 and 9.9; the two `signalTyping` sites named alongside it already awaited
inside their `try`, so they were correct.

**10.6 — [FIXED] `channel-view/text/renderer/content-cache.ts` — the cache key contains the whole
message.** `getMessageContentCacheKey` returns
`${message.id}:${message.editedAt ?? 0}:${message.content ?? ''}`, so the Map holds up to
500 keys that each duplicate an entire message's HTML in memory, on top of the parsed
`ReactNode` value and the copy already in the Redux store. With no length limit (10.1)
one large message triples its own footprint. The content is only load-bearing because
plugin command updates rewrite `content` without touching `editedAt`
(`send-message.ts:200`), so `id:editedAt:updatedAt` or a short hash would do.

Two smaller notes in the same file: `trimCache` evicts a single entry in insertion order
once full, so above 500 entries it is FIFO, and it evicts exactly the older messages a
user scrolling upward is about to re-render — the cache degrades in the one scenario it
exists for. And `media-cache.ts:43` reimplements `trimCache` as `trimMediaCache`, the same
ten lines.

Fixed both halves, by decision.

The cache key is now `id:editedAt:hash(content)` using a small non-cryptographic hash, so
500 entries no longer each hold a second copy of a message's HTML. The content still takes
part in the key because a plugin command rewrites `content` without touching `editedAt`.

Eviction moved from FIFO to least-recently-used, in a shared `renderer/lru-cache.ts` that
`content-cache.ts` and `media-cache.ts` both use. That also removes the duplicated
`trimMediaCache`. Verified against the real module: filling to the cap then reading the
oldest entry keeps it and evicts the genuinely least-recent one instead, which is the
scroll-upward case the cache exists for.

**10.7 — [FIXED] 24 event handlers are defined inline in JSX, several inside list bodies.**
AGENTS.md is explicit: "Never define an event handler inline in JSX … a new function
identity on every render defeats the `React.memo` on the child receiving it". The ones
that cost are inside `.map` callbacks, where a fresh closure per item per render is
created for a memoized child: `message-reactions.tsx:231`
(`onClick={() => handleReactionClick(reaction.emoji)}` per reaction),
`message-actions.tsx:179` (per quick-reaction emoji), `pinned-messages-popover.tsx:63`
(per pinned message), `channel-view/voice/index.tsx:56,81,107` (per voice tile). The
remainder (`onClick={(e) => e.stopPropagation()}` and similar) are harmless in isolation
but keep the pattern alive.

Fixed all of them, by decision: 25 sites, not 24, and the count is now zero across the four
folders in scope.

The ones that mattered got a memoized child that owns its own handler, so the parent passes
a stable callback: `Reaction` takes `onSelect(emoji)`, a new `QuickReactionButton` and
`ScrollToMessageButton` wrap their list items, `CommandArgInput` replaces the inline
`onChange`/`onKeyDown` pair inside the argument map, and the three voice cards now take
`cardId` plus `pinCard` directly and build their own descriptor.

**Worth recording about the voice cards:** those three `onPin` closures were created inside
a `useMemo`, so they churned per memo invalidation rather than per render. Real, but smaller
than the finding implies.

The rest became `useCallback`s. Three lint errors surfaced during the work and were fixed:
one hook placed after an early return, one dependency on a module-level import, and one
missing `t` dependency.

### LOW

**10.8 — `thread-sidebar/tread-content.tsx` is misspelled** ("tread"). Second filename
typo found in the repo after `helpers/__tests__/pasre-command-args.test.ts` (7.19).

**10.9 — seven components exceed the 200-line guidance.**
`message-compose/index.tsx` (354), `tiptap-input/extensions/commands/plugin-command-node.tsx`
(345), `channel-view/voice/external-stream-card.tsx` (344), `tiptap-input/index.tsx`
(330), `channel-view/voice/screen-share-card.tsx` (273), `channel-view/text/index.tsx`
(242), `channel-view/text/message-reactions.tsx` (240). None is egregious next to
chunk 9's 1311-line provider, and every one of them already has a `hooks/` or `helpers.ts`
neighbour to extract into.

### Missing tests

None exist (chunk 8). 10.3 is the one worth a regression test the moment a test setup
exists: switch channels while a scroll timer is pending and assert the scroll position of
the new channel is untouched.

## 11. Client screens & chrome

Scope: `screens/**` and every remaining folder under `components/` not covered by chunks 9
and 10: `server-screens/`, `dialogs/`, `left-sidebar/`, `top-bar/`, `mod-view-sheet/`,
`user-popover/`, `paginated-list/`, `plugins-controller/` and the rest. 162 files,
~17,900 lines. No tests, per chunk 8.

`left-sidebar/channels.tsx` is worth calling out as correct: `handleDragEnd` is exactly
the pattern AGENTS.md cites it for (inline `getTRPCClient()` call at the call site,
try/catch, `t()` in the toast), so the guide's reference is accurate.

### HIGH

**11.1 — [FIXED, read path only] a past security fix left its read path behind, and it still prefills the login
form with stored passwords.** Commit `2700fa1` ("fix(#76): Removed local storage of
sensitive credentials") removed the code that *wrote* the user's password to
localStorage. It did not remove:

- `helpers/storage.ts:4` — the `USER_PASSWORD = 'sharkord-user-password'` key;
- `screens/connect/index.tsx:45` — `password: getLocalStorageItem(LocalStorageKey.USER_PASSWORD) || ''`,
  which still reads that key and prefills the password field with it;
- `screens/connect/index.tsx:46` — a `rememberCredentials` form field initialised from
  `REMEMBER_CREDENTIALS` and never rendered or used anywhere.

For a fresh install this is dead code. For any user who ran a version before the fix, the
plaintext password is **still in their localStorage**, the current build reads it back on
every visit to the connect screen, and nothing ever deletes it. The remediation removed
the write and left the credential and its reader in place.
Fix: delete the read and the `rememberCredentials` field, and call
`removeLocalStorageItem(LocalStorageKey.USER_PASSWORD)` on app start so existing
installations are actually cleaned, then drop the enum key in a later release.

Verified before fixing: the read, the unused field and both enum keys were all present, and
`git show 2700fa1` confirms that commit removed only the writes (the
`setLocalStorageItem(USER_PASSWORD)` call, the identity write, the remember-me checkbox and
its `onChange`).

Fixed the read path: `screens/connect/index.tsx` no longer reads `USER_PASSWORD` or
`REMEMBER_CREDENTIALS`, the password field starts empty, and the dead `rememberCredentials`
form field is gone. Nothing in the client reads either key now.

**The active cleanup was not done, by decision.** A `purgeStoredCredentials()` on app start
was written and then removed at the user's request. The consequence: for anyone who ran a
build from before 2700fa1 (19 Feb 2026), the plaintext password is **still in their
localStorage**. It is no longer read or displayed, but nothing deletes it, and it stays
there until that origin's storage is cleared by hand. The two enum keys remain in
`LocalStorageKey` with no reader and no writer.

### MED

**11.2 — [FIXED] the avatar, banner and logo managers are one flow written three times, and they
have drifted.** `user-settings/profile/avatar-manager.tsx` (81 lines),
`user-settings/profile/banner-manager.tsx` (90) and
`server-settings/general/logo-manager.tsx` (68) implement identical upload → save →
toast → refresh sequences. The drift is in the error handling:

- avatar: `catch (error) { toast.error(getTrpcError(error, 'Failed to remove avatar')) }`
  — surfaces the server's message;
- banner and logo: `catch { toast.error('Could not remove banner. Please try again.') }`
  — **discards the error entirely**, so the server's actual reason (quota exceeded, file
  too large, uploads disabled) never reaches the user.

This is the client half of a pair: `change-avatar.ts`, `change-banner.ts` and
`change-logo.ts` are the same triple on the server (3.18, 4.17), and both triples have
drifted independently. One parameterised `<ImageManager kind=… />` collapses three files,
and it is the natural place to fix 3.5 (delete-before-save) once instead of three times.

Fixed as a **hook** rather than the parameterised component the finding proposed, because the
three genuinely differ in what they render: a circular `UserAvatar`, a rectangular banner
with a placeholder, and an `ImagePicker`. Only the upload, mutate, toast and refetch flow is
shared, so that is what `hooks/use-image-manager.ts` holds, parameterised by
`'avatar' | 'banner' | 'logo'` with an optional `onChanged` for the logo's refetch.

The drift is gone with it: all three now surface the server's message through
`getTrpcError`, where banner and logo previously swallowed the error and showed a fixed
"Please try again", hiding quota, size and uploads-disabled reasons. The three files went
from 239 lines to 89.

**11.3 — [FIXED] 23 user-facing strings bypass i18n.** AGENTS.md is explicit that toast messages
in `catch` blocks go through `t()`. Twelve are bare literals
(`fullscreen-image/content.tsx:139,141`, the three image managers) and eleven are
`getTrpcError(error, '<literal>')` fallbacks (`dialogs/plugin-commands/index.tsx:92`,
`dialogs/search/hooks.ts:49`, `thread-sidebar/thread-compose.tsx:97` (10.4), all four
handlers in `voice-provider/hooks/use-voice-controls.ts`, the image managers). The rest of
the app uses `t()` correctly, so these read as the places where someone was in a hurry.
Each also needs adding to every locale via `bun run synci18n`.

Fixed, and the count was exactly 23. Twelve of them belonged to the image managers and
disappeared into 11.2's hook; the rest were replaced in place. 35 keys added across all
seven locales (12 for the image managers, 22 for the remainder, 1 for 11.5's new plugin load
failure).

The first pass used the imperative `i18n.t('common:key')` everywhere, including inside hooks
and components, to avoid threading `t` through a dozen dependency arrays. That was wrong and
was corrected: anything that is a component or a hook now uses
`const { t } = useTranslation('common')`, with `t` added to the dependency array of every
callback that uses it (13 arrays). The imperative form is kept only where there is no hook to
call: `features/app/actions.ts`, `features/server/actions.ts`,
`features/server/voice/actions.ts`, `features/server/plugins/actions.ts` and
`helpers/assert-notifications-permission.ts`. That distinction is now written down in
AGENTS.md.

**11.4 — [FIXED, scoped by measurement] 142 event handlers are defined inline in JSX across 59 files** in this chunk
alone, on top of the 24 in chunk 10. The rule exists for the ones inside list renders, and
those are present here too, including in the file AGENTS.md holds up as the reference:
`left-sidebar/channels.tsx:400` does `onClick={() => onChannelClick(channel.id)}` inside
the `channels.map(...)` that renders memoized `<Channel>` children, so every sidebar
render hands each channel a new function identity and defeats the memo. Fixing all 142 is
not worth it; fixing the ones inside `.map` bodies is.

**Scoped by measurement.** The finding counts 142 inline handlers; I measured how many are
inside `.map` bodies, which is where the rule's rationale applies: **22**. Then I measured
how many of those pass the handler to a **memoized** child, which is the only case where a
fresh closure defeats anything: **two**. The other 20 attach to plain elements or to UI
primitives (`Button`, `button`, `CardContent`, `DropdownMenuItem`), none of which are
memoized, so the closure is an allocation with no memo to defeat, and making them stable
would mean extracting roughly 20 new row components.

Fixed the two that cost something:

- `left-sidebar/channels.tsx`, which matters most because AGENTS.md holds this file up as
  its reference. `Channel` now takes `onSelect(channelId)` and builds its own handler.
- `server-settings/emojis/emoji-list.tsx`, via a small memoized `EmojiOption` wrapper. The
  shared `Emoji` component was left generic rather than coupled to emoji ids, since
  `update-emoji.tsx` also uses it.

The remaining 120 are recorded as deliberately untouched.

**11.5 — [PARTLY FIXED, consent flagged as F8] plugin client bundles are dynamically imported and run with full page
privileges.** `features/server/plugins/actions.ts:41` builds
`${serverUrl}/plugin-bundle/<id>/<client entry>` and `await import()`s it, then renders the
exported components into slots. That code runs on the app's own origin with access to
`localStorage` (including `AUTO_LOGIN_TOKEN` and the session token), the DOM and anything
else the page can reach. It is the client mirror of 6.1, with one difference worth
stating: on the server the admin who installs a plugin is the one who runs it, whereas
here **every user's browser executes it** and the user is never asked. That belongs in the
plugin documentation and ideally in a consent prompt.

Two smaller issues in the same function: the loop `await`s each import in sequence, so N
plugins load serially on every connect, and a bundle that fails to load is reported only
via `console.error`, so an admin has no way to see that a plugin's UI is broken (the
`plugins.getLogs` route only covers the server side).

Fixed the two concrete problems, flagged the model. Bundles now load through
`Promise.allSettled` over the whole list instead of `await` in a loop, so N plugins no
longer load serially on every connect, and a bundle that fails to load raises a toast naming
the plugin instead of only reaching `console.error`.

**Not fixed:** the privilege model itself. Plugin client code still runs on the app's origin
with access to `localStorage`, the session token and the DOM, and the user is never asked.
That is the client half of 6.1, which was dismissed as intended on the server side, but the
difference the finding draws is real: on the server the admin who installs the plugin is the
one who runs it, whereas here every user's browser executes it. Recorded as **F8**.

**11.6 — [DEFERRED, see T5] four files exceed the size guidance, two of them by a lot.**
`server-screens/user-settings/devices/index.tsx` is **684 lines** in a single `Devices`
component (AGENTS.md: 200 for components, 400 for screens), with
`hooks/use-microphone-test.ts` at 612 beside it;
`server-screens/server-settings/storage/index.tsx` is 437; `left-sidebar/channels.tsx` is
409. The devices screen is the one to split first: it already has a `hooks/` folder and
the microphone, webcam and playback sections are independent.

**11.7 — [FIXED] two generic components live in the app instead of the UI package.**
AGENTS.md: "Generic, styleable, logic-free components belong in `packages/ui`, not here."
`components/paginated-list/` (362 lines) is a pure pagination + search + context
component with no app knowledge, and `components/date-picker/` (172) is the same. Both are
imported from several screens. Moving them is mechanical and it is exactly the boundary
the guide draws.

Fixed: `paginated-list` and `date-picker` moved to `packages/ui/src/components/` and are
exported from its barrel. Both were single files importing only from `@sharkord/ui`,
`lucide-react` and `react`, with no i18n and no app knowledge, so the move was mechanical.
Their internal imports were repointed at sibling modules, and the five call sites now take
them from `@sharkord/ui`.

Note their own inline handlers moved with them, so the two `paginated-list` sites counted in
11.4 are now in `packages/ui` and fall under chunk 12.

### LOW

**11.8 — `screens/connect/index.tsx:76` sends an `autoLogin` field the server ignores.**
`http/login.ts`'s `zBody` declares only `identity`, `password` and `invite`, and zod strips
unknown keys, so the value is silently discarded. Auto-login is handled entirely client
side by storing the token; the field suggests a server behaviour that does not exist.

### Missing tests

None exist (chunk 8). 11.1 is the case where a test would have mattered most: the fix
commit had no way to assert "no credential is read from storage", so the read survived the
fix by two years of commits.

## 12. Shared & UI packages

Scope: `packages/shared/**` (38 files), `packages/ui/**` (34), and the client's
`hooks/`, `helpers/` and `lib/` folders. `packages/shared`'s **layout** is chunk 14's job;
this pass covers its content and confirms chunk 14's preliminary observations with data.

`packages/shared` is the best-tested code in the repo relative to its size: 149 passing
tests, with 751 lines covering the command parser and 398 covering the message sanitizer.
`packages/ui` is a clean shadcn-style component set. Two corrections to earlier chunks
came out of this pass (1.1 and 10.2, both amended in place).

### HIGH

**12.1 [FIXED] — `apps/client/src/lib/trpc.ts:35-48` — every WebSocket close is a full logout, so
the app cannot survive a network blip.** `createWSClient`'s `onClose` calls `cleanup()`
unconditionally, and `cleanup` (line 86) closes the socket, nulls `wsClient` and `trpc`,
removes `AUTO_LOGIN_TOKEN` from localStorage, removes `TOKEN` from sessionStorage and
resets four slices. tRPC's ws client has its own reconnection, but there is nothing left
to reconnect with: the client object is gone and so are both tokens.

`keepAlive` is configured with `intervalMs: 30_000, pongTimeoutMs: 5_000`, so a five
second stall — a laptop waking from sleep, a phone switching from wifi to cellular, a
server restart during a deploy — closes the socket and drops the user back to the connect
screen. The scar tissue around it says the same thing: the `isNavigatingAway` flag with
its comment about Firefox firing `onClose` during refresh, the `isCleaningUp` guard reset
by `setTimeout(…, 100)` with the comment "this should help Firefox users who report that
auto login is not consistent". Those are three workarounds for one design decision.
Fix: distinguish a transport-level close (reconnect, keep the tokens) from an
authentication failure or an explicit disconnect (clean up). Only the latter should clear
credentials.

**Correction to the finding: reconnecting the transport is not enough, and the finding's
suggested fix would have produced a half-dead session.** Tracing the installed
`@trpc/client` 11.12.0 (`wsLink-*.mjs:604-605`), the close listener calls `onClose(event)`
and then immediately calls `this.reconnect(...)`, whose `tryReconnect` is gated on
`allowReconnect`. `cleanup()` runs `wsClient.close()`, and `close()` sets
`allowReconnect = false`, so today the library's reconnection fires on every blip and is
disarmed by our own handler one line earlier.

But letting it run would not have helped. `createContext` starts every socket with
`authenticated: false` (`utils/wss.ts:165`); only `others.joinServer` flips it and calls
`setWsUserId` (`routers/others/join.ts:70`), and the handshake hash is per socket. Every
subscription is a `protectedProcedure` behind `authMiddleware`. A silent transport
reconnect therefore yields a socket where the user counts as offline and all of the
re-subscribed events fail `UNAUTHORIZED`. Recovering a dropped connection means replaying
the whole join, not reopening the transport.

**What was done.** Close handling now classifies, in `lib/trpc.ts`:

- `isTerminalClose` is `KICKED` or `BANNED` only, the two closes the server chose for this
  specific user. Those still `cleanup()` exactly as before.
- `SERVER_SHUTDOWN` and everything else (1006, 1001, keep-alive timeouts) are treated as a
  dropped connection: a new `closeClient()` discards the transport without touching either
  token or any store state, and `reconnectToServer()` is scheduled. Retrying a shutdown was
  a deliberate decision, since a deploy restart is the case where reconnecting is worth most.
- `onClose` returns early when `isNavigatingAway` or `isCleaningUp`, so a page refresh and an
  explicit `disconnectFromServer()` no longer schedule a pointless reconnect.

`features/server/actions.ts` holds the loop: 5 attempts on a 1s/2s/4s/8s/8s backoff, each
attempt calling the existing `connect()` so the handshake and join are replayed on a fresh
client. A `UNAUTHORIZED`/`FORBIDDEN` failure abandons immediately rather than burning the
budget on a token that will never work. Abandoning calls `cleanup()`, restores the original
close info and plays the disconnect sound, which is the pre-existing behaviour, just delayed
by up to ~30s.

Supporting changes: a `reconnecting` flag in the server slice (cleared by `setInitialData`,
so a successful rejoin clears it automatically and the password-dialog path keeps the app
visible until the user finishes); `reconnectingSelector` and `useIsReconnecting`; a
`ReconnectingBanner` component; `Routing` keeps `ServerView` mounted while reconnecting
instead of falling through to `<Connect />`, and its `Disconnected` condition gained
`SERVER_SHUTDOWN`, which previously fell through to the connect screen because it closes
cleanly. `joinServer` now tears down the previous subscriptions before re-subscribing,
inside a `try`/`catch`: on a rejoin they belong to a socket that is already gone, and a
throw there would have aborted every reconnect attempt.

The three Firefox workarounds (`isNavigatingAway`, `isCleaningUp`, the 100ms `setTimeout`)
were **left in place**. They should be redundant now that close reasons are distinguished,
but they guard a refresh path with no automated coverage, so removing them is a separate
change. See T6.

Not verified by running the app: the client has no test harness and the branch needs a real
server to disconnect from. Testing it locally would have meant creating an account, so this
is handed over as M42/M43 instead.

**Out of RFC range, worth knowing:** `KICKED = 40000`, `BANNED = 40001` and
`SERVER_SHUTDOWN = 40002` are all outside the close codes RFC 6455 permits (1000-1014 and
3000-4999), and npm `ws`'s own `isValidStatusCode` rejects them. They work only because
under Bun the server resolves `ws` to bun's builtin, which skips that validation; a real
browser then reports them verbatim with `wasClean = true` (measured). The whole
terminal-vs-transient split keys off these codes, so this is now load-bearing. See T7.

### MED

**12.2 [FIXED] — `helpers/storage.ts` carries four credential keys that nothing writes.**
`USER_PASSWORD` and `REMEMBER_CREDENTIALS` are read by the connect screen and never
written (11.1); `SERVER_PASSWORD` (line 5) is declared and neither read nor written
anywhere; `IDENTITY` (line 2) is read at `connect/index.tsx:44` to prefill the login form
and, like the password, has no writer left. So the login screen restores an identity and a
password from keys the app stopped maintaining, and three of the four keys are pure
residue from the credential-storage removal. Delete them together with the reads, and
clear the stale values from existing installations.

**12.3 [FIXED] — `bun run knip` reports a substantial amount of dead code and dependencies.** Run
as part of this pass:

- **1 unused file**: `apps/client/src/helpers/download-file.ts`.
- **5 unused dependencies**: `embla-carousel` and `tailwindcss` in `apps/client`,
  `date-fns`, `eslint-plugin-react-you-might-not-need-an-effect` and `tailwindcss` in
  `packages/ui`. Plus 2 unused devDependencies (`tw-animate-css`,
  `@types/react-dom` in `plugin-sdk`). `tailwindcss` listed as unused in two packages is
  worth checking by hand before removing, since it is usually consumed through a config
  rather than an import.
- **34 unused exports and 3 unused exported types**, concentrated in the client's feature
  actions and hooks: `setConnected`, `setConnecting`, `setServerId`, `setCategories`,
  `setChannels`, `setEmojis`, `setRoles`, `setUsers`, `addPluginCommand`,
  `removePluginCommand`, `addPluginComponents`, `useIsConnecting`, `useOwnUser`,
  `useSelectedChannel`, `useChannelIds`, `useVoiceChannelState` and more. That is a
  domain-actions layer written to a template rather than to demand.
  `userRolesIdsSelector` (8.1) is in the list, so one of the four broken selectors is
  simply deletable.
- **1 duplicate export**: `zPluginPackageJson` is `zPluginManifest` under a second name
  (`packages/shared/src/plugins/index.ts:26`).

Note for chunk 14: knip found **zero** unused exports in `packages/shared`, which is
almost certainly an artefact of the `export *` barrel rather than a clean bill of health.
Chunk 14's step 2 ("drop exports nothing imports, `bun run knip`") should not be trusted
until the barrel is replaced with explicit re-exports.

**12.4 [FIXED] — `packages/ui` knows about the transport layer.**
`components/input.tsx:1` and `components/textarea.tsx:1` both
`import type { TTrpcErrors } from '@sharkord/shared'`. AGENTS.md: "`packages/ui` —
Presentational components only, no app logic". A generic `Input` that understands the
shape of a tRPC error is the boundary violation the rule exists to prevent; the error
prop should be a plain `string | undefined` and the mapping should happen at the call
site.

**12.5 [FIXED] — the shared package's public surface opens with dead junk.**
`packages/shared/src/index.ts:1` is literally `export const A = 123;`, exported to every
workspace that imports the package (chunk 14 noted this; confirmed). The rest of the file
is `export *` over eleven modules, which is what hides 12.3's blind spot.

**12.6 [FIXED] — `helpers/upload-file.ts:7` mangles non-ASCII filenames for no benefit.**
`getSafeFileName` normalizes to NFKD and replaces every non-ASCII byte with `_`, so
`café.png` is uploaded as `cafe_.png` and that is the name stored in `originalName` and
shown to every user in the channel. The server already sanitizes independently
(`http/helpers.ts:64` `sanitizeFileName`, which strips path components and rejects null
bytes) and stores the display name separately from the on-disk name, so the client-side
mangling only destroys information. Anyone whose language is not English sees their
filenames corrupted.

**12.7 [FIXED] — `helpers/upload-file.ts:100` uploads files one at a time.** `uploadFiles` awaits
each `uploadFile` in a `for` loop, so attaching five images to a message takes the sum of
five round trips rather than the maximum. Same shape as 11.5's sequential plugin loading.

**Fix records for the MED batch.**

*12.2* was narrower than written: 11.1 had already removed the `USER_PASSWORD` and
`REMEMBER_CREDENTIALS` reads, leaving those two plus `SERVER_PASSWORD` as enum entries with
neither reader nor writer. All three are deleted. `IDENTITY` was the live half, read at
`connect/index.tsx:43` with no writer; by decision the **writer was restored** rather than the
read removed, since an identity is a username and auto-login already persists a far more
sensitive token. Stale values are deliberately **not** cleared from existing installs, keeping
M38's earlier decision, so a pre-11.1 browser still holds `sharkord-user-password` until the
user clears site data.

*12.3* went from 33 unused exports to zero, in two passes: the flagged exports first, then the
seven selectors (`devicesSelector`, `isCtrlHeldSelector`, `isAltHeldSelector`,
`selectedChannelSelector`, `channelIdsSelector`, `connectingSelector`,
`voiceChannelVideoExternalStreamsSelector`) that only became dead once their sole consumer
hooks were gone. Ten slice reducers were removed alongside their action wrappers, since each
wrapper was the reducer's only caller and knip cannot see a dead reducer inside `createSlice`.
`download-file.ts` is deleted and `zPluginPackageJson`/`TPluginPackageJson` are gone, with
nothing outside the declaring file importing either.

Three of the five "unused" dependencies were **knip false positives** and were kept:
`tailwindcss` and `tw-animate-css` in `apps/client` are consumed through `vite.config.ts` and
an `@import` in `index.css`, which knip does not parse, and `@types/react-dom` in
`plugin-sdk` matches its declared `react-dom` peer. Removed: `embla-carousel` in
`apps/client` (only `embla-carousel-react` is imported, and it carries its own copy), plus
`date-fns`, `eslint-plugin-react-you-might-not-need-an-effect` and `tailwindcss` in
`packages/ui` (react-day-picker declares its own date-fns; the eslint plugin was in
`dependencies` for a package with no eslint config, and the live copy is in `apps/client`).

*12.4* replaced the `TTrpcErrors` import in `input.tsx` and `textarea.tsx` with a local
`TFieldErrors = Record<string, string | undefined>`. Structurally identical, so every call
site is unchanged, and `packages/ui` no longer imports the transport's vocabulary.

*12.5* removed `export const A = 123;`. The `export *` barrel is left alone: replacing it with
explicit re-exports is chunk 14's step, and it is what makes knip blind to `packages/shared`.

**Correction to 12.6: the suggested fix would have broken uploads outright.** The finding reads
the NFKD mangling as pointless defensiveness. It is not. Measured in a real browser:
`setRequestHeader` throws `TypeError: String contains non ISO-8859-1 code point` for a CJK or
Cyrillic filename, so simply deleting `getSafeFileName` would have made every upload from a
Chinese, Japanese, Korean or Russian user fail at the point of sending. Latin-1 accents like
`café.png` do survive, but only because the byte round-trips through node's latin1 header
decoding by luck.

The fix is percent-encoding instead of mangling: the client sends `encodeURIComponent(name)`
and `sanitizeFileName` decodes before its path checks. Decoding **before** the checks is
load-bearing, or an encoded `%2e%2e%2f` would walk straight past `path.basename`; a malformed
escape such as `100%.txt` falls back to the raw name. Six new assertions in `upload.test.ts`
cover the round trip, the encoded-traversal and encoded-null-byte cases, and the malformed
escape. Older clients that send raw names keep working, since decoding them is a no-op.

*12.7* replaced the serial `for` loop with `Promise.all` over `files.map`, filtering the
undefined results a failed upload already toasted about. Order is preserved.

### LOW

**12.8 [FIXED] — `helpers/download-file.ts` is dead** (knip), and `getStreamQualityLabel`,
`EMOJI_SIZE`, `ROW_HEIGHT`, `clearDraftMessage`, `UsersTyping` and `useTheme` are exported
and unused. Listed separately from 12.3 because these are the ones that are plainly safe
to delete.

**12.9 — `packages/shared` is tested only under `helpers/`.** All six test files live in
`helpers/__tests__`; the other 30 modules (`types.ts`, `tables.ts`, `trpc.ts`,
`events.ts`, `logs.ts`, `plugins/`, `statics/`, `voice.ts`) have none. Most are type-only
declarations where that is correct; `plugins/index.ts` (197 lines, including
`zPluginManifest`, which is the validation gate for every installed plugin) is the
exception worth covering. Confirms chunk 14's observation.

### Missing tests

The client half has none (chunk 8). For the packages: 12.1 is the one worth a test even
before a client test setup exists, because it can be asserted at the `cleanup()` boundary
— close the socket without an auth failure and assert the tokens survive.

## 13. Test suite

Scope: `apps/server/src/__tests__/**` (the harness), all 46 `*.test.ts` files
(~17,100 lines) and `packages/e2e/**`. Green as of this audit: 820 server + 149 shared
tests, 0 failures. (Now 953 server + 147 shared, after the fixes in this chunk and earlier ones.)

The harness is genuinely good. Per-test in-memory databases swapped through a `Proxy`
around the mocked `db` module, migrations and seed applied fresh in `beforeEach`, rate
limiters and voice-move grants reset between tests, a real HTTP server for the HTTP
routes, and real tRPC callers built from the real `createContext`. Route coverage is
thorough where it exists (`messages.test.ts` alone is 2099 lines) and `cascade.test.ts`
systematically verifies foreign-key behaviour. The findings are about what the harness
makes impossible to test, and one thing it accidentally proves.

### HIGH

**13.1 [DISMISSED, INTENDED] — the test harness is a working proof of concept for 5.1.**
`__tests__/helpers.ts:8-16`:

```
const getMockedToken = async (userId: number) => {
  const hashedToken = await sha256(TEST_SECRET_TOKEN);
  return jwt.sign({ userId }, hashedToken, { expiresIn: '86400s' });
};
```

That is precisely the attack described in 5.1: take the ownership token, hash it with a
public one-way function, and mint a valid session token for **any** `userId` without
touching the database. The suite does it 800 times per run, for arbitrary user ids,
and the server accepts every one.

This is worth recording under the test chunk for two reasons. It removes any doubt about
whether 5.1 is exploitable — the repository contains a working implementation. And it
means fixing 5.1 requires changing this helper too: once the JWT secret is independent of
`secretToken`, the harness must read the real signing key rather than deriving it, which
is a good forcing function for making that key explicit.

### MED

**13.2 [FIXED] — `__tests__/setup.ts:96-104` will recursively delete a directory the operator
chose.** `afterAll` runs `fs.rm(DATA_PATH, { recursive: true })`, and `helpers/paths.ts`
resolves `DATA_PATH` by checking `process.env.SHARKORD_DATA_PATH` **first** (line 11-15),
before the `IS_TEST` branch that yields `./data-test` (line 17). `SHARKORD_DATA_PATH` is a
documented deployment variable, so any operator who has it exported in their shell, or any
CI job that sets it for a self-hosted instance, loses that entire directory the moment
they run `bun run test`. The `packages/e2e` config does exactly that (it sets
`SHARKORD_DATA_PATH: e2eDataPath`), which shows the pattern is in active use.
Fix: in `getDataPath`, let `IS_TEST` win over the env override, or refuse to delete a path
that is not the test path.

**13.3 [FIXED] — the mock context hardcodes the connection, so a whole class of behaviour cannot
be tested.** `__tests__/context.ts:93-98` builds every request as
`{ headers: {}, socket: { remoteAddress: '127.0.0.1' } }`. Every test therefore runs from
the same IP with no forwarded headers, which means:

- the forwarded-header trust chain (1.2, the rate-limit bypass) is unreachable from any
  test;
- per-IP rate limiting is exercised only in the degenerate single-key case, so the
  eviction path (1.12) and any keying bug are invisible;
- `getWsInfo`'s parsing is covered by its own unit test but never end-to-end.

Making `createMockContext` accept headers and a remote address is a small change that
unlocks tests for three existing findings.

**13.4 [FIXED] — the logger is replaced with no-ops for the whole suite.** `setup.ts:29-47`
(`DISABLE_CONSOLE = true`) silences console and mocks `../logger` to no-op functions. Any
code path that catches an error, logs it and continues is therefore indistinguishable from
success in tests. The codebase has many: `pipeFileStream`'s error handler,
`cleanupFiles`, plugin load failures, `getIpInfo`, `updater.update`. None of them can be
asserted on today. A test-visible log sink (collect into an array, assert on it) would
make "did this actually fail quietly" a testable question.

**13.5 [ALREADY DONE] — `cascade.test.ts` is thorough about the cascades that exist, which is what hides
2.6.** Sixteen tests cover channel, category, user, role, file and message deletion
against `message_files`, `message_reactions`, `channel_read_states`,
`channel_*_permissions`, `user_roles`, `role_permissions`, `emojis`, `logins`, `invites`,
`activity_log` and `direct_messages`. There is no test for `parentMessageId` or
`replyToMessageId` on message deletion, because those two columns have no foreign key
(2.6) and the file is organised around foreign keys. The suite's completeness is exactly
why the omission is invisible: a reader concludes cascades are covered.
Add the two cases as failing tests when 2.6 is fixed.

**13.6 [FIXED] — the e2e suite covers login and scrolling, and one of its four files asserts
nothing.** 17 tests total: `connect.pw.ts` (3), `auto-login.pw.ts` (7),
`infinite-scroll.pw.ts` (6) and `mocked.pw.ts` (1). The last is a manual-exploration
harness — it early-returns unless `process.env.RUN_MOCK` is set, then sleeps for 9999999 ms
— so in a normal run it is a passing test that exercises nothing. Real browser coverage is
therefore authentication plus message pagination. Nothing covers sending a message,
voice, permissions, server settings, plugins or DMs, which is most of the product and
(per chunk 8) the only automated coverage the client has at all.

**13.7 [FIXED] — `setup.ts:54` binds the test HTTP server to a hardcoded port 9999.** No port-0
fallback and no retry, so a developer with anything on that port gets an opaque suite-wide
failure. `createHttpServer` already takes the port as a parameter; passing `0` and reading
back `server.address()` removes the constraint.

**Fix records for the MED batch.**

*13.2* is fixed at the root: `getDataPath` now checks `IS_TEST` **before** the
`SHARKORD_DATA_PATH` override, so a test run can only ever resolve `./data-test`. The e2e
server is unaffected because it sets `IS_E2E`, not `NODE_ENV=test`, and still gets its
injected path. `setup.ts`'s `afterAll` also refuses to `fs.rm` anything that is not the
resolved test path, as a second line of defence against a future reordering.

Verified both directions rather than assumed, since this one destroys data. With a sentinel
file in an injected directory: after the fix the file survives a test run; with the original
ordering restored, the same run **deleted the directory outright**. The finding is real and
the fix closes it.

*13.3* gave `createMockContext` optional `headers` and `remoteAddress`, threaded through
`getCaller` and `initTest` as an optional second argument, so existing call sites are
untouched. The new `__tests__/connection-context.test.ts` spends that capability on the three
things the finding named: the forwarded-header trust gate end to end through the real
`createContext` (untrusted socket ignores `x-forwarded-for`, `x-real-ip` and
`cf-connecting-ip`; a trusted proxy by exact match and by CIDR is honoured; a chain picks the
first public address), per-IP rate-limit keying (exhausting `joinServer` from one address
leaves another address unaffected, and a spoofed forwarded header cannot escape an exhausted
bucket), and user-agent parsing end to end.

Both spoofing tests were checked against the broken behaviour, which F2 records as the step
that got skipped last time: with the trust gate removed from `getWsIp` they fail, and with it
restored they pass. They are regression tests, not just passing assertions.

*13.4* replaced the no-op logger mock with a recording one. `testLogs` collects
`{ level, message }` and is cleared in `beforeEach`; `findTestLog(level, substring)` is the
accessor. Console output is still silenced. The new test file uses it to assert that a request
with no identifiable IP really does log the rate-limiter's skip warning, which was previously
indistinguishable from the request simply being allowed.

*13.5* needed nothing: the two cases it asks for were added when 2.6 was fixed.
`cascade.test.ts:329` covers thread replies being deleted with their parent and
`cascade.test.ts:369` covers an inline reply's pointer being nulled. Marked done rather than
fixed.

*13.6* is fixed only in its mechanical half, by decision. `mocked.pw.ts` now calls
`test.skip(!process.env.RUN_MOCK, ...)` instead of early-returning, so a normal run reports it
as skipped rather than as a passing test that exercised nothing, and it imports `sleep` from
`helpers.ts` instead of redeclaring it, which also closes 13.9. The coverage half is deferred
to T8: writing e2e for messages, voice, permissions, settings, plugins and DMs is a project
rather than an audit fix, and new specs could not be run to green here.

*13.7* replaced the hardcoded port 9999 with `createHttpServer(0)`, reading the real port back
from `server.address()`. This was not theoretical: earlier in this audit a full run produced
**195 failures all reporting `fetch() URL is invalid`**, which is exactly this mechanism, the
`beforeAll` hook throwing and leaving `testsBaseUrl` undefined so every HTTP test fetched
`"undefined/info"`.

### LOW

**13.8 — four fixed `sleep()` calls in the e2e tests** (`infinite-scroll.pw.ts:102,116,137`
and `mocked.pw.ts:19`) alongside otherwise correct `waitFor`/`expect` usage. Fixed delays
are how e2e suites become flaky on slower CI.

**13.9 [FIXED] — `packages/e2e/tests/helpers.ts` exports exactly one function, `sleep`, and
`mocked.pw.ts:4` declares its own copy** rather than importing it.

**13.10 — `tests/setup/global.setup.ts` is a `console.log` and nothing else.** The
teardown beside it does real work; the setup is a placeholder that has never been filled
in.

**13.11 — direct row inserts in six test files.** `cascade.test.ts`,
`messages.test.ts`, `users.test.ts`, `login.test.ts`, `public.test.ts` and
`file-manager.test.ts` insert rows inline rather than using `seed.ts`. For scenario-
specific data (a cascade chain, a pagination window) that is the right call and AGENTS.md's
rule is about reusable fixtures, so this is a note rather than a finding — but it is worth
checking each one when 2.6 and 3.2 add seeded rows, since `setup.test.ts` asserts exact
seeded counts and will need updating.

### Missing tests

The gaps are recorded per chunk above; the structural ones are here:

- **the client has no test setup at all** (chunk 8): no test files, no `test` script, no
  runner. Chunks 8 through 12 are entirely unverified except by `tsc`. Adding a runner is
  a precondition for testing any of those findings.
- **`utils/pubsub.ts` has no tests** despite being the delivery path for every realtime
  event (noted in 7).
- **`utils/wss.ts` has no tests**, which is where the permission context and the socket
  identity bug (7.1) live.
- **no cron or queue tests** (7.2, 7.5, 7.7).

## 14. Shared package reorganization

Status: **inventory and blocker recorded, no files moved. Deferred in full to [T9](#t9--chunk-14-reorganize-packagesshared-the-whole-chunk-deferred-here-by-decision).** This chunk's own step 3 says
the target layout must be agreed with the maintainer before any move, and the audit is
read-only, so this pass delivers the inventory, one blocking finding that changes the
plan, and a proposed layout to approve or reject.

### The blocker: `shared` imports the server, and the client ships the result

**14.1 — `packages/shared/src/tables.ts:2-22` imports `apps/server/src/db/schema` through
a relative path that escapes the package.**

```
import { activityLog, categories, /* …20 tables… */ users }
  from '../../../apps/server/src/db/schema';
```

Everything about this is load-bearing for the reorganization:

- **The dependency direction is inverted and undeclared.** `apps/server` depends on
  `@sharkord/shared`; `tables.ts` makes `@sharkord/shared` depend on `apps/server`. There
  is no declared dependency (there cannot be, the app is not a package), so the coupling
  is invisible to the package manager and to `knip`. `packages/shared` cannot be built,
  published or reasoned about on its own, and `packages/plugin-sdk` inherits the same
  constraint through its own dependency on shared.
- **It is a value import, and `verbatimModuleSyntax: true`** (`packages/shared/tsconfig.json:14`)
  means TypeScript emits it verbatim rather than eliding it. The table objects are only
  used in type position (`InferSelectModel<typeof settings>`), but the import statement
  survives, and `schema.ts` calls `sqliteTable(...)` at module scope, which a bundler must
  treat as side-effectful.
- **So the client ships the server's database schema.** Verified against a real production
  build (`bun run build`, `dist/assets/index-*.js`, 2.77 MB / 711 kB gzipped): the bundle
  contains `drizzle:entityKind`, 17 `drizzle` occurrences, and the literal column and
  table names `channel_read_states`, `message_reactions` and `secret_token`. Every visitor
  downloads drizzle-orm's sqlite-core and the full table definitions of a database they
  can never reach. No secret values are exposed — these are identifiers, not data — but
  the entire storage layout of the server is published to anyone who opens devtools, and
  it is paid for in bundle size on every page load.

`tables.ts` is the largest module in the package (48 of its exports). Reorganising the
package around folders while its biggest module reaches into another workspace would move
the problem without fixing it, so this comes first.

Fix: define the row types in `packages/shared` directly rather than inferring them from
the server's schema, and have `apps/server` assert its schema matches (a
`satisfies`-style type test in the server, where drizzle already lives). That severs the
edge, removes drizzle from the client bundle, and makes the package independently
buildable, which is a precondition for every step below.

### Inventory

31 source modules (excluding tests), 12 top-level `export *` lines in `index.ts`.
Export counts by module:

| Module | Exports | Consumers | Note |
| --- | --- | --- | --- |
| `tables.ts` | 48 | server, client | derived from the server schema (14.1) |
| `plugins/index.ts` | 36 | server, client, plugin-sdk | includes `zPluginManifest`, the install-time validation gate |
| `types.ts` | 29 | server, client | mixed: enums, DTOs, generic type utilities |
| `statics/storage.ts` | 25 | server, client | constants |
| `helpers/index.ts` | 13 | server, client | barrel over 12 helper modules |
| `statics/index.ts` | 9 | server, client | barrel |
| `voice.ts` | 8 | server, client | |
| `extensions.ts` | 7 | client only | tiptap extension config |
| `statics/permissions.ts` | 4 | server, client | also holds `UploadHeaders` (see below) |
| `plugins/hooks.ts`, `plugins/client-sdk.ts` | 4 each | plugin-sdk, client | |
| `logs.ts` | 3 | server (7 files), client (4) | |
| `events.ts` | 2 | server (28 files), client (0 direct) | `ServerEvents` is server-only in practice |
| `trpc.ts`, `test-ids.ts`, `statics/metrics.ts`, `plugins/marketplace.ts` | 1 each | | |

Consumer counts: `apps/server` imports `@sharkord/shared` in 172 files, `apps/client` in
166, `packages/ui` in 3, `packages/plugin-sdk` in 3, `packages/e2e` in 0.

Findings that fall out of the inventory:

**14.2 — `index.ts:1` is `export const A = 123;`** (confirmed in 12.5). It is the first
line of the public surface of a package consumed by 344 files.

**14.3 — the `export *` barrel makes dead-export analysis impossible.** `knip` reported
zero unused exports in `packages/shared` while finding 34 in the client and server, which
is an artefact of the barrel, not a clean result. Step 2 of the original plan ("delete
first, using knip") cannot be trusted until `index.ts` re-exports explicitly. Reverse the
order: make the barrel explicit **first**, then run knip, then delete.

**14.4 — the three type modules split by no criterion.** `tables.ts` holds row types
inferred from the schema, `types.ts` holds enums, DTOs (`TPublicServerSettings`,
`TServerInfo`, `TTempFile`) and generic utilities (`WithOptional`, `TGenericObject`),
`trpc.ts` holds one export. A contributor adding a type has no rule to follow. The
generic utilities in particular are not domain types at all.

**14.5 — misfiled exports.** `UploadHeaders` lives in `statics/permissions.ts:35`
alongside the permission enums and has nothing to do with permissions — and it is the enum
that caused the misreading corrected in 1.1, because nobody looking at an upload route
would think to check a permissions file for the meaning of a header name.
`zPluginPackageJson` is an alias of `zPluginManifest` (12.3). `extensions.ts` is imported
only by the client, and `events.ts`'s `ServerEvents` appears in 28 server files and no
client file directly.

**14.6 — tests cover only `helpers/`.** Six test files, all under `helpers/__tests__`.
`plugins/index.ts` is the gap that matters: `zPluginManifest` validates every plugin
manifest at install and load time (6.4 is a bug in what happens *after* it validates), and
it has no tests.

### Proposed target layout

To approve, amend or reject before anything moves:

```
src/
  index.ts            explicit re-exports, no `export *`
  domain/             row and DTO types, no drizzle inference
    channel.ts  message.ts  user.ts  role.ts  file.ts  settings.ts  voice.ts
  permissions/        Permission, ChannelPermission, role defaults
  plugins/            manifest schema, SDK contracts, marketplace types  (unchanged)
  helpers/            unchanged, already coherent
  constants/          storage, metrics, upload headers, misc statics
  events/             ServerEvents + payload map
  utils/              WithOptional, TGenericObject and friends
```

Rules to apply while moving, in addition to the existing one ("if only one workspace
imports it, it does not belong in shared"):

- nothing in `packages/shared` may import from `apps/**`;
- `index.ts` names every export explicitly, so the public surface is readable in one file
  and knip can see it.

Candidates for eviction under the single-consumer rule: `extensions.ts` (client only),
`test-ids.ts` (client and e2e only, and e2e imports shared in zero files today), and
`plugins/client-sdk.ts` (client and plugin-sdk).

### Revised steps

1. **Sever the server dependency (14.1).** Define row types in shared; add a type-level
   conformance check in `apps/server`. Verify with a client build that `drizzle` and the
   table names are gone from the bundle.
2. **Make `index.ts` explicit** and delete `export const A = 123`.
3. **Now run `bun run knip`** and delete what it finds, including `zPluginPackageJson`.
4. **Agree the layout above**, then move one domain per commit, imports updated in the
   same commit, no re-export shims.
5. After each move: `bun run check-types`, `bun run test`, `bun run knip` from the root.
6. Add tests for `plugins/index.ts` before or during the move (14.6).

Steps 1 to 3 are worth doing regardless of whether the layout is ever agreed: each one
stands on its own, and step 1 is the only finding in this chunk that reaches production.
