# Manual tests

Behaviour the automated suites cannot reach, collected from [AUDIT.md](AUDIT.md) to be clicked
through in one pass. Rows marked **Now covered by e2e** were automated when the scroll and
pagination suites were rewritten and are kept only for the parts the harness cannot stage. Two reasons something lands here: the harness has no mediasoup, so nothing
about voice runtimes, transports or producers can be exercised; or the change is in a client
path that neither the unit suites nor the e2e suite covers.

Tick a box when the observed behaviour matches. When it does not, write what happened next to
the row rather than leaving it unticked with no trace, and add a finding to AUDIT.md.

**M numbers are stable** and referenced from AUDIT.md. Do not renumber them.

The **Unit** and **E2E** columns say what automation now covers, so a row can be skipped or
run with the right expectations:

| Value | Means |
| --- | --- |
| Yes | covered by that layer |
| Partial | covered in part, or reached through a neighbouring test rather than its own |
| Gap | reachable by that layer and **not written yet** |
| No | not reachable there: real hardware, a real network drop, or client rendering with no test runner |

`apps/client` and `packages/ui` have **no test runner at all**, so every client-only row reads
No in the Unit column. The e2e suite runs chromium only, against one shared server.

Progress: **62 / 80 closed, 15 still to run.** 42 of those were run by hand; the other 20 are
closed on the strength of their unit tests without a manual run.

**The rule is now simply the Unit column.** Every row with unit coverage, Yes or Partial, is
closed. Every row still open reads Unit **No** — real microphones, real network drops, broad
UI sweeps and client rendering, none of which a unit test can reach. So the 15 below are not a
backlog of unwritten tests; they are the rows where a person is the only instrument.

On a **Partial** row the unit test covers the row's main claim and the coverage table names
what it does not reach: M20's stall timeout, M51's DNS resolution path, M13's client half,
M54's custom-logo dimensions, M62's name search, M14's still-running plugin, M41's pagination
and date picker, M63's post-restart uploads, M74's banner behaviour.
Automated coverage over the 80 rows: Unit **41 Yes, 9 Partial, 0 Gap, 30 No**; E2E **13 Yes, 4 Partial, 0 Gap, 63 No**.
No Unit gaps remain: every row is either covered, partly covered with the untestable part named, or out of reach of a unit test.

**3 retired from the manual pass:** M16 and M53 moved to unit tests, M17 ignored by decision.

## Production build required

Run against a real build (`bun run build`), not `bun dev`: in development this route redirects to the Vite server, so the headers under test are never sent.

| ✓ | # | Unit | E2E | Finding | What to do | Expected |
| --- | --- | --- | --- | --- | --- | --- |
| [x] | M70 | Yes | No | 1.13 | Against a **production build** (not `bun dev`, which redirects this route to Vite), open devtools and use the app broadly: join voice with each noise suppression mode, install a plugin and use its UI, browse the marketplace, load avatars and uploaded images | Everything works, because the policy is report-only. Collect every `Content Security Policy` violation the console reports and widen the policy in `http/interface.ts` to match. **Only when the console is clean does the header get renamed** from `Content-Security-Policy-Report-Only` to `Content-Security-Policy`; the test asserting the enforcing header is absent has to be updated in the same change |

## Two browsers or two clients

Open a second browser profile or an incognito window and log in as a different seeded user.

| ✓ | # | Unit | E2E | Finding | What to do | Expected |
| --- | --- | --- | --- | --- | --- | --- |
| [x] | M49 | Yes | Partial | 1.17 | Log in on two browsers, then change your password on one | The other is disconnected immediately and cannot reconnect with its old session. The one you changed it on stays connected. Log in again with the new password and confirm it works right away | **Passed:** the second browser was disconnected
| [x] | M21 | Yes | Yes | 7.1 | Open the app in two tabs as the same user, then ban that user from a third session | Both tabs disconnect, not just one. Repeat with kick, and with deleting the account |
| [x] | M58 | Yes | Yes | 3.14 | Log in on two browsers as the same user, then have an admin kick that user | Both sessions end and neither can resume. Logging in again immediately works, which is the intended behaviour: kick ends the session, it does not bar re-entry. **This path has no automated coverage** because kick requires a live socket the harness cannot provide |
| [x] | M25 | Yes | Yes | 7.9 | With two clients connected, close one and watch presence | The user stays online while the other tab is open and goes offline when the last one closes. This replaced the scan that decided that |
| [x] | M3 | Yes | Yes | 3.4 | Create a category with a voice channel, join the voice channel from a second client, then delete the category | Both clients stop rendering the channel immediately, no reload needed, and the voice session ends. Server logs show no mediasoup router left behind |
| [x] | M13 | Partial | No | 4.14 | Delete a voice channel while two people are in a call in it | Both clients drop out of the call immediately and stop listing the participants, no reload needed | **Failed first time (R4)**, fixed since, closed on the unit test that covers the server half. Audio stopped and nothing rendered, but the sidebar still read "Voice connected"; the server's own leave event now clears the local voice session, so the panel unmounts. `channels.test.ts` proves the event fires. **The client half was never re-run by hand** and is the only unverified part left of R4
| [x] | M12 | Yes | No | 4.9 | As a moderator with `MOVE_MEMBERS`, move a user into a voice channel, including a private one | The move works, the target is pulled in and can see the channel. Try it from a moderator who cannot see the destination: refused | **Passed.** Turned up two things now fixed: a dm call could be used as the destination (see R5 in [AUDIT.md](AUDIT.md)), and the moved user got a loading skeleton that never resolved instead of being told why the chat was empty, now M80
| [x] | M80 | Yes | No | R5 | Move a user into a private voice channel they cannot normally see, then have them open that channel's text panel | A lock icon and "No access to this chat" explaining they are in the call but cannot read its messages. Not a loading skeleton, and not the messages themselves: the chat stays inaccessible by decision | **Passed**
| — | M16 | Yes | No | 5.4 | As the owner, try to open a DM channel between two other users; then use a private channel you do have access to | The DM is refused with the membership message, the private channel still works normally | **Moved to unit tests, not runnable by hand:** there is no way to ask the ui for a dm you are not part of. Covered by `routers/__tests__/dms.test.ts`, which refuses the owner on get, send and markAsRead and shows a real participant still gets through
| — | M53 | Yes | No | 1.25 | As two users behind the same network, have one spam a rate-limited action | Only the spammer is limited. Previously both shared a bucket | **Moved to unit tests, not runnable by hand:** it needs two users on one public address, and what it checks is the key the limiter buckets by. Covered by `utils/__tests__/trpc-rate-limit.test.ts`, verified against ip-only keying where the bystander is limited too
| — | M17 | No | No | 5.5 | Run the server normally and confirm `apps/server/data` grows a `db.sqlite-wal` file; send messages while scrolling history from a second client | Both work without stalling each other. WAL is the one change here with a visible on-disk difference | **Ignored by decision:** WAL is visible on disk and the rest is covered by the query work
| [x] | M18 | Yes | Partial | 5.11/5.3 | On a server with a lot of history, scroll a busy channel and watch unread badges update | Scrolling and badge updates stay responsive; this is the pair of changes meant to make that cheap | **Passed**

## Real microphone, camera and speakers

Voice has no automated coverage at all: the harness has no mediasoup, so this group is the only verification these paths ever get.

| ✓ | # | Unit | E2E | Finding | What to do | Expected |
| --- | --- | --- | --- | --- | --- | --- |
| [x] | M29 | No | No | 9.2 | Join a voice channel with noise suppression on and the noise gate **off**, then leave | The browser's microphone indicator goes out and the device is released. Repeat with the gate on, and with both off | **Now also checks the new readout:** with each mode selected, open the stats popover and confirm the Microphone section names the one that is actually on (Standard, RNNoise, DTLN). With suppression off the section is absent rather than reading "None" **Passed**
| [x] | M30 | No | No | 9.3 | Force a join to fail (stop the server mid-join, or block the mic) | The UI reports a failed connection **and** the microphone indicator goes out, rather than staying captured | **Passed**
| [x] | M31 | No | No | 9.1 | Join a call with several participants and video on, then open the stats popover | The call is visibly smoother when the popover is closed, and the popover still updates once a second while open. The screen share card still shows its codec | **Passed**
| [x] | M32 | No | No | 9.10 | Join a call and leave the stats popover closed, then open it | The popover fills in and updates while open. Counters resume rather than showing the whole call, which is expected now that polling only runs while something is watching | **Passed**
| [ ] | M33 | No | No | 9.6 | With noise suppression set to DTLN, then RNNoise, then off, join a call and speak | All three paths still load their worklet and process audio. This touched the loader every processor shares |
| [x] | M34 | Yes | No | 9.11 | Mute and unmute the mic, stop a screen share, then leave the call | Server side producers are cleaned up in every case. This swapped the event the cleanup mutation hangs off | **Passed**
| [x] | M67 | No | No | 9.14 | Join a call with the noise gate on, change its threshold in settings, and watch the console | The gate responds to the change and the console stays quiet. A warning from `[noise-gate]` or `[audio-meter]` means the message contract between the .ts and .js sides has drifted | **Passed**
| [x] | M10 | No | No | 4.4 | Join voice, then toggle camera/screenshare repeatedly and reconnect a few times | Memory and port usage stay flat, old streams do not linger, and the user's own video keeps working after repeated toggles | **Passed**
| [x] | M59 | Yes | No | 4.16 | Join a voice channel, speak, enable video, change stream quality, then leave | All of it still works. This rewrote the opening guard of ten voice routes, so a mistake shows up as a route refusing to work rather than as a subtle bug | **Passed**

## A real plugin installed

Any published marketplace plugin will do.

| ✓ | # | Unit | E2E | Finding | What to do | Expected |
| --- | --- | --- | --- | --- | --- | --- |
| [x] | M19 | Yes | No | 6.2/6.12 | Install or reinstall a real plugin, toggle it off and on, and check the server logs | It loads and reloads correctly. `ctx.log` still works (deprecated). The one breaking change is that a plugin without an `onUnload` export now fails to load |
| [x] | M20 | Partial | No | 6.5 | Install a plugin whose bundle is very large or whose host stalls | The install fails with a size or timeout error and leaves no partial file in the downloads directory |
| [x] | M14 | Partial | No | 4.11 | Install a plugin while offline, or with a bad checksum, then check the plugin list | The install fails with an error but the previously enabled plugin is still running, not dead until restart |
| [x] | M61 | Yes | No | 4.20 | Install a plugin, change one of its settings, then remove it, and open the activity log | All three appear in the log. The setting entry names the key but **not** the value |
| [x] | M69 | Yes | No | 12.10 | Open the plugin marketplace, browse the list, open a plugin's detail view, and install one | All five plugins appear with logos and screenshots, homepage links work, and installing still works. The registry is validated now, so a plugin silently missing from the list means its entry failed the schema |
| [x] | M9 | Yes | No | 4.3 | With plugins enabled, save the storage settings page, then use a plugin command | Plugins keep working, no restart needed |

## Reconnection and session handling

The biggest behaviour change in the audit. M42 first.

| ✓ | # | Unit | E2E | Finding | What to do | Expected |
| --- | --- | --- | --- | --- | --- | --- |
| [x] | M42 | No | No | 12.1 | Connect, then restart the server (or drop the network for ~10s). Watch the app, not the connect screen | The channel stays on screen behind a "Reconnecting" banner, then the banner clears and messages/presence resume without a reload. **This is the whole point of the change: you should never be returned to the login screen.** Repeat with a longer outage (>30s) to confirm it gives up and shows the disconnected screen | **Passed**
| [x] | M43 | Yes | Yes | 12.1 | While connected, get kicked and then banned from another session. Separately, hit Disconnect in the UI, and refresh the page (Firefox especially) | Kick and ban still end the session immediately and show their own screens, with no reconnect attempts. Disconnect still logs out. A refresh still auto-logs-in, meaning the token was not cleared | **Passed**
| [x] | M44 | No | No | 12.1 | On a server with a password and `onlyAskForPasswordOnFirstJoin` **off**, force a reconnect | The password dialog reappears over the still-visible app; entering it restores the session, cancelling logs out. The password is deliberately not stored, so a re-prompt is expected here | **Passed on the re-run.** First run failed with the dialog unclickable, see R6. The overlay was moved under the dialog layer between the two runs, but the original failure was never reproduced afterwards, so it is not certain that is what fixed it
| [x] | M71 | No | Yes | 12.11 | Enable "Login automatically", log in, then invalidate the session from another browser (change your password, or have an admin kick you). Reload the tab | The connect screen appears with the identity prefilled, not the crash screen and not a 23-second "Reconnecting" banner. The auto-login switch is off and the saved token is gone | **Passed**
| [x] | M72 | No | No | 12.11 | While connected, drop the network for ~10s and, **during** the reconnecting banner, open the search dialog, a DM, and the pinned-messages popover | The mount effects here call `getTRPCClient()` while the client is discarded, so the concern was a crash into the error boundary. Also check that DM lists and voice events still update afterwards, since those subscriptions may be bound to the old client | **Passed, and the predicted crash did not happen.** None of the three reached the error boundary, and DM lists and voice events resumed once the overlay cleared. See T6 in [AUDIT.md](AUDIT.md): the `getTRPCClient()` calls are still there, so this is evidence they are not reached rather than proof they cannot be
| [x] | M68 | No | Yes | 11.8 | Log in with "Login automatically" both on and off, close the tab, and reopen it | Auto-login happens only when the switch was on. The removed field was never read by the server, so nothing should change | **Passed**
| [x] | M47 | No | Yes | 12.2 | Log in, log out, and return to the connect screen | The identity field is prefilled with the last identity used. The password field is always empty | **Passed**
| [x] | M79 | No | No | R3 | Drop the network for ~10s and watch the reconnect overlay itself: try clicking and tabbing to things behind it, watch the countdown and the attempt counter, then hit "Stop trying to reconnect" | The app is visible through the blur but nothing behind it responds to mouse or keyboard. The countdown ticks down and the attempt counter advances 1 to 5. The button ends the session and returns to the connect screen, and because it runs the same teardown as Disconnect it also clears the auto-login token | **Passed**

## Messages, channels and search

| ✓ | # | Unit | E2E | Finding | What to do | Expected |
| --- | --- | --- | --- | --- | --- | --- |
| [x] | M74 | Partial | Yes | 2.4 | Search for a message far back in a busy channel and jump to it. Check the banner, scroll up from the window, click the banner, and repeat in a channel that is actively receiving messages | The window opens around the target with a "Viewing older messages" banner; scrolling up loads older messages continuously; the banner returns you to the newest message and disappears. **Messages arriving while the banner is up are deliberately withheld** and appear when you return. Jumping to a recent message shows no banner at all | **Now covered by e2e** (`pagination.pw.ts`, both jump specs). Still worth one human pass for the actively-receiving-messages case, which the suite cannot stage
| [ ] | M73 | No | Yes | 8.2 | Scroll far up in a busy channel to load several pages, switch to another channel, then come back. Repeat with a DM, and with the voice chat sidebar's text panel open on a different channel | The channel you return to renders immediately at the bottom with no loading flash, scrolling up still loads older messages, and nothing appears out of order or duplicated. Memory does not keep climbing across a long session of channel hopping | **Now covered by e2e** (`pagination.pw.ts`, channel retention). The DM and voice-sidebar variants are not, so run those two
| [ ] | M64 | No | Yes | 8.12 | Scroll far up in a busy channel to load several pages, then jump to an old message from search | Messages stay in the right order in both cases. This removed an ordering option that two call sites were passing and that the reducer had always ignored | **Now covered by e2e** (`pagination.pw.ts` ordering + jump specs)
| [x] | M55 | Yes | Yes | 2.21 | Search for a term that matches far more than 25 messages | The results list ends with a line saying only the most recent matches are shown. Search with a narrow term and confirm the line is absent | **Passed**
| [x] | M56 | Yes | No | 2.20 | Pin a message, check the pin list, then unpin it | Pinning and unpinning both work and the pin list updates. Anything showing who pinned a message should be blank after unpinning, not name whoever unpinned it | **Passed**
| [x] | M57 | Yes | No | 2.23 | Edit and delete your own message, then someone else's as an admin, and delete a file from a message | All five paths work and the refusals still name the specific action ("edit this message", "delete this file") |
| [x] | M22 | Yes | No | 7.3 | Send messages containing an emoji, a mention, a channel reference and a hard line break, and check they render as before | All four still render correctly. This is the change most likely to have a visible regression, since it filters the class attribute | **Passed**
| [x] | M23 | Yes | No | 7.4 | Send a message with a github emoji and one with a custom server emoji, then reload | Both still render. This is the change most likely to break emoji, since image sources are now filtered | **Passed for rendering.** Turned up a separate regression alongside it: the "Add Reaction" picker button was missing from the message actions, see R7
| [ ] | M35 | No | Partial | 10.3 | Scroll up in a busy channel, switch to another channel within a second, then switch back | Neither channel jumps to the bottom unexpectedly. This replaced four uncleaned timers with a ResizeObserver | **Partly covered by e2e** (`scroll-position.pw.ts`). The switch-within-a-second timing is not staged, so run that
| [ ] | M37 | No | No | 10.6 | Scroll far up in a long channel, then scroll back down | Messages re-render correctly in both directions, and previously seen messages stay cached rather than being re-parsed |
| [ ] | M65 | No | Partial | 8.13 | Open channels, switch between them, and open a DM | Channel lookups still resolve. This changed the selector that resolves a channel by id, and got the declaration order wrong first |
| [x] | M5 | Yes | No | 3.9 | Drag channels within a category and categories in the sidebar, then reload | The order persists exactly as dropped, for every connected client |

## Uploads and storage

| ✓ | # | Unit | E2E | Finding | What to do | Expected |
| --- | --- | --- | --- | --- | --- | --- |
| [x] | M45 | Yes | No | 12.6 | Upload files named `café.png`, `文書.png`, `привет.txt` and `100%.txt`, then check how they appear in the channel and on disk | All four keep their real names. The CJK and Cyrillic ones are the important cases: before this change they were mangled to underscores, and a naive fix would have made them fail to upload at all |
| [x] | M46 | No | No | 12.7 | Attach five files to one message | They upload concurrently rather than one after another, every progress bar advances, and all five land on the message. Make one fail (oversized) and confirm the other four still attach | **Passed:** the five ran concurrently and all landed, and an oversized one did not take the others with it
| [x] | M52 | Yes | No | 1.25 | Seek around in a large uploaded video or audio file, in Chrome and Safari | Seeking works in both. Safari leans on suffix ranges (`bytes=-N`), which the server previously answered 416 to | **Passed**
| [x] | M15 | Yes | No | 5.2 | Fill the server past its storage quota with `DELETE_OLD_FILES` set, then check avatars, emojis and the logo | Old message attachments are reclaimed; avatars, custom emojis and the server logo are all still there | **Passed:** old attachments were reclaimed and the avatars, emojis and logo survived
| [x] | M39 | Yes | No | 11.2 | Change and remove an avatar, a banner and the server logo, including a failing case such as an oversized file | All six actions work, and a failure now shows the server's actual reason for all three, not just the avatar | **Passed**
| [x] | M4 | Yes | No | 3.5 | Set an avatar, then set `storageMaxAvatarSize` very low and try to change it | Error toast, and the previous avatar is still displayed after a reload | **Passed**
| [x] | M60 | Yes | No | 4.17 | Set a server logo, replace it, then remove it. Then try replacing it with an oversized file | The logo changes and clears correctly, and a failed replacement leaves the previous logo in place rather than none | **Passed**
| [x] | M54 | Partial | No | 1.25 | Change the server logo, then reload the PWA install prompt / manifest | The new logo and its dimensions are picked up. Dimensions are cached by file name now, so a changed logo must still refresh | **Passed:** the replaced logo and its dimensions were picked up

## Admin and permissions

| ✓ | # | Unit | E2E | Finding | What to do | Expected |
| --- | --- | --- | --- | --- | --- | --- |
| [x] | M1 | Yes | No | 3.1 | As a non-owner admin holding `MANAGE_USERS`, try to ban, kick and delete the owner from the admin panel | Each is refused with "Only users with the owner role can act on the server owner." Banning a regular user still works | **Passed**
| [x] | M2 | Yes | No | 3.3 | As a non-owner holding `MANAGE_ROLES`, edit a role and try to grant a permission you do not have; then rename a role that already holds one | The grant is refused, the rename succeeds | **Passed:** the grant was refused and the rename went through
| [x] | M7 | Yes | No | 3.21 | Open the channel permissions dialog in the admin panel | Permissions load as before, this route changed from a mutation to a query |
| [x] | M11 | Yes | No | 4.5 | Claim ownership with the secret token on a fresh server, then try the same token again | First succeeds, second is refused with "You already have the owner role." Existing sessions and image/file URLs keep working afterwards |
| [x] | M62 | Partial | No | 7.12 | Open the admin users list and search by name, then open a user's moderation panel both as the owner and as an admin without VIEW_USER_SENSITIVE_DATA | Name search works. The identity row shows the identity for the permitted user and is blank for the other. **Searching by identity no longer appears to work, because it never did** |
| [x] | M8 | Yes | No | 4.2 | Set a server join password, then open the **storage** settings page and save | The join password still applies to new joins. This is the bug that made the password vanish |
| [x] | M6 | Yes | No | 3.10 | Create a voice channel | It appears and is joinable. (The runtime-failure rollback path cannot be triggered without exhausting mediasoup workers) |
| [x] | M41 | Partial | No | 11.7 | Open the search dialog, the invite dialog and the moderation activity lists | Pagination, search and the date picker all behave as before, now that both components live in the ui package |

## Server operations

| ✓ | # | Unit | E2E | Finding | What to do | Expected |
| --- | --- | --- | --- | --- | --- | --- |
| [x] | M63 | Partial | No | 7.18 | Start the server, upload a file, install a plugin, and check the logs directory | Everything works. This moved eight files between helpers/ and utils/, so a missed import shows up as a boot failure |
| [ ] | M24 | No | No | 7.7 | Restart the server, then check the `activity_log` table directly: **nothing in the app reads it**, so there is no log view to open | The `SERVER_STARTED` entry is no longer attributed to the owner. Confirm the log renders a missing user sensibly rather than blank or crashing |
| [x] | M50 | Yes | No | 1.15 | On a server with real history, register a new account and time the login | It returns promptly, and the new user's channels all show zero unread. Post a message afterwards and confirm it shows as unread for them |
| [x] | M51 | Partial | No | 1.24 | Paste a link whose host resolves into 100.64.0.0/10 or another reserved range, and a normal public link | The reserved one gets no preview, the public one still does. SSRF blocking is stricter than before |
| [ ] | M27 | No | No | 8.10 | Kill the server while the app is open, then bring it back | The UI shows its disconnected state rather than silently freezing, and recovers on reconnect |
| [ ] | M26 | No | No | 8.5 | Open an unread channel with the server stopped, then watch the unread badge | The badge clears optimistically and comes back when the call fails, instead of staying cleared until refresh |
| [ ] | M66 | No | No | 9.12 | Open devtools and run `sharkordDebug.printVoiceStats()` while in a call, and `sharkordDebug.openSoundsModal()`. Then confirm `useToken('...')` still works unchanged | The two debug helpers now live under `sharkordDebug`; the ownership command is untouched, which matters because it is documented online |

## Broad regression sweeps

Each covers a change that touched many call sites, where a miss shows up as something missing or blank rather than as an error.

| ✓ | # | Unit | E2E | Finding | What to do | Expected |
| --- | --- | --- | --- | --- | --- | --- |
| [ ] | M48 | No | No | 12.3 | Exercise the app broadly: emoji picker, typing indicators, drafts, theme switching, voice quality menus, plugin commands and components | Nothing is missing. This removed 40 exports and 10 slice reducers, so a missed consumer would show up as a blank or broken control rather than a build error |
| [ ] | M36 | No | No | 10.7 | React to messages, use the quick reaction row, pin and unpin voice cards, and fill in a plugin command's arguments | All still work. This touched 25 handlers, including extracting four new child components | **Run this one carefully:** the missing reaction picker (R7) is exactly what this sweep exists to catch, and it was found by accident instead
| [ ] | M28 | No | No | 8.7/8.3 | Play a notification sound, and watch typing indicators and the voice participant list with several users | Sounds still play from their new location, typing indicators name the right people, and voice participants render correctly |
| [ ] | M40 | No | No | 11.3 | Switch the app language, then trigger a few error toasts (join a voice channel with the server down, upload with uploads disabled) | The toasts appear in the selected language rather than English |
| [ ] | M38 | No | No | 11.1 | In a browser that used a pre-February build, open devtools and check localStorage for `sharkord-user-password` | The connect screen's password field is empty, but the stored value is still present. That is expected: the read is gone, the value is not deleted |

## Migration safety

Added after the audit shipped a migration that destroyed data on a real server, see R1 in
[AUDIT.md](AUDIT.md). Run these **before** this branch touches anything you care about.

| ✓ | # | Unit | E2E | Finding | What to do | Expected |
| --- | --- | --- | --- | --- | --- | --- |
| [x] | M75 | Yes | No | R1 | Take a **copy** of a production database from before this branch, note the row counts for `message_files`, `message_reactions`, messages with `reply_to_message_id`, thread replies and non-null `channel_read_states.last_read_message_id`, then boot this branch against the copy | Every one of those counts is unchanged after migrating. This is the regression that deleted all five on a real server: `PRAGMA foreign_keys` is a no-op inside a transaction, so the pragma written into the migration files never disabled anything. **Do not run this branch against a database you have not backed up** | **Passed:** `message_files` count unchanged, `message_reactions` and `reply_to_message_id` both still populated
| [x] | M76 | Yes | No | R1 | On a server that already booted an earlier build of this branch, check whether attachments still render on old messages and whether reactions are still there | If they are gone, that database is already damaged and needs restoring from backup. The fix prevents recurrence; it cannot bring rows back | **Passed:** attachments and replies present
| [x] | M77 | Yes | Yes | R2 | Open a direct message that shows an unread badge, then switch away and back | The badge clears on open and stays cleared. Repeat with the DM already open when a message arrives |
| [x] | M78 | Yes | No | R1 | After migrating, open each channel once and confirm the unread badge clears and stays clear across a reconnect | Read markers were reset to NULL by the old migration and are deliberately **not** repaired, so expect one round of "everything unread" that clears per channel as you visit it | **Passed:** nothing showed as unread. Note this is the migration no longer nulling the markers, not a repair: rows already nulled by an earlier boot of this branch stay nulled, so a database that was damaged before the fix still needs its backup

## Start here

If there is only time for a handful:

1. **M36** — the sweep that exists to catch exactly what R7 was (a control deleted during a
   refactor), and which found it by accident instead. Nothing else covers those 25 handlers.
2. **M48** — the other broad sweep: 40 removed exports and 10 removed slice reducers, where a
   missed consumer shows up as a blank control rather than a build error.
3. **M33** — the last untested voice path, and the only worklet loader nobody has exercised
   since it was extracted.
4. **M26** — the optimistic unread badge, whose revert-on-failure branch is the one thing the
   DM badge tests deliberately do not cover.
5. **M65** — the channel-by-id selector that was wrong once already, on declaration order.

The rows closed by a Partial unit test are worth a pass eventually for the part named above,
but none of them is blind: something covers each row's main claim.

