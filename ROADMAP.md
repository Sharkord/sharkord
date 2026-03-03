# H8D13's SHARKORD FORK ROADMAP
> [Recent Commits](https://github.com/h8d13/sharkord/commits/development/)

## Feets in fork: 

- Whiteboards [stolen from MIT gh](https://github.com/Biplo12/BoardFlow) 
- Mardown to HTML using `marked` from [npm](https://www.npmjs.com/package/marked) 
- Links (show external warning) 
- Audio/Video preview
- Syntax highlighted code
- Nicknames (JSON local only) 
- Use actual UUIDs and jwt token for `/public/` path files (unless server login image) 
- Lazy load most things / Chunk 
- Cleanup after leaving channel / using settings page 
- Remove per voice channel chat redundant 
- UX/UI candy changes 
- DMs / Mentions fixes / Direct reply (upstream) 
- Client-side Embeds for links 
- Remove hardcoded `SharkordUser` 
- Search all messages
- Security fixes Replaced `Access-Control-Allow-Origin: *` with origin validation against the Host header
- Added `X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Strict-Transport-Security, Content-Security-Policy`
- Removed password hash from `getUserById` and `getUsers` DB queries (kept only in `getUserByIdentity` for login)