# Home update
## Binder detail and sharing
- [x] Add owned binder editing, covers, nine-card swipe pages and tap-to-read reasons.
- [x] Add confirmed public sharing and a signed-out public binder page.
- [x] Add Mori binder previews with Rename, Create and Publish; verify saved rename/reasons, signed-out public/private access and phone layout. Sixteen regression tests passed.
## My Collection
- [x] Match supplied collection layout and unify icon-only active navigation across screens.
- [x] Persist three owner-selected grail ranks, add menus/picker and private slab-photo uploads.
- [x] Verify grail selection persists after reload, rank replacement, four-column grid and active navigation on phone/desktop; eight collection tests pass.
- [x] Replace sample cards with owned Cards, Binders, Memories and Wish list tabs.
- [x] Add 12-card pagination, name/set/artist search, Mori shortcuts and a session-only noticed prompt.
- [x] Show binder covers and private memory/story views; keep grails empty until real slab photos are supplied.
- [x] Verify signed-in cards, tab actions, notice dismissal and Add-to-Mori replay on phone and desktop; pagination/search rules passed tests.
- [ ] Populate grail slab photos — users can now select grails and upload their actual slab photos; screenshots are references, not collection assets.
## Mori chat
- [x] Fix identity-only initialization, profile retry/upsert, touch focus, auth modes, duplicate messages and onboarding search guards.
- [x] Validate photo ownership at the chat boundary and memory tool; enforce private owner-folder storage policies.
- [x] Run 19 regressions; verify live signed-in token refresh, chat, touch focus, boundary rejection and owner/foreign storage access. Verify profile retry and missing-profile onboarding with intercepted browser responses.
- [x] Strengthen saved history, tool validation and confirmation safeguards.
- [x] Stream replies and show tool status while Mori works.
- [x] Apply supplied chat presentation and formatted replies using AI Elements.
- [x] Test tool argument rules and unsigned access protection.
- [ ] Verify signed-in saving end-to-end; streaming, existing points and history reload have been observed with a registered account.

## Home
- [x] Replace events and wire their destinations.
- [x] Add progress cards using actual collection counts.
- [x] Rotate the daily question; add Tell Mori and Later.
- [x] Verify Home layout and public actions; leave Mori Studio unchanged.
- [x] Verify signed-in Home name and points, owner-scoped progress, and idea replay into Mori with a live reply.
- [x] Receive all three Home reference screenshots.
- [x] Match screenshot layout: greeting, banner pagination, circular progress, illustrated ideas and floating memory prompt; retain requested gradient banners, specified ideas and actual counts.