# Homepage and navigation UX verification

Verified September 29, 2026 (America/Phoenix), on `dev`. No push or release.

The editor now keeps a separate draft with explicit Save/Cancel, searchable multi-add, duplicate prevention, position selection, keyboard reordering, touch/mouse drag handles, whole-card targets and continuous edge scrolling. Saves preserve the draft on failure and disable conflicting controls while pending. Widget links reach their actual destination, including the selected occurrence of a shift already running. Calendars group dates in the account's time zone. Previews are shorter and use their container width.

Public group/shift/route pages separate factual badges from actions. The homepage switch names its destination and includes an icon. Product navigation no longer includes the Discord marketing page. Notifications and Behavior have their own settings pages; join confirmations link to Behavior. The selected settings tab stays visible in the mobile navigation rail.

The sizing follow-up gives cards in each row matching heights, consistent padding and bottom-aligned footer actions. The next-shift card uses the same spacing as other widgets; the host group preview shows two groups with an All groups link. Single-column mobile cards keep their natural heights. This uses CSS with the existing homepage payload, adding no API/database requests or migration.

## Real browser validation

`bun run test:widgets:ui` passed against the production Docker frontend, real API and isolated PostgreSQL/Valkey storage. It covers:

- Default user/host card and editor alignment at 1440, 1024, 768, 375 and 320px, natural mobile heights, empty states and no horizontal overflow.
- Search, no results, multiple additions, duplicates and focus.
- Keyboard arrows, direct position selection, resizing, removing, cancellation and reset.
- Desktop mouse dragging onto the body of a card and actual CDP touch gestures.
- A deliberately failed save, retry, delayed save, disabled pending controls and no duplicate writes.
- Reload persistence, independent user/host layouts, persisted mode and unsaved navigation cancellation.
- Calendar selection, unique occurrence anchors, ongoing signups and the signed-up-only list.
- Primary-group pin persistence and a real favorite-route change reflected in its widget.
- Empty homepage recovery, signed-out settings guards, Behavior toggle persistence, Notifications links and 375/320px layouts, including route-menu bounds.

The engagement regression passed 34 desktop/mobile captures, every user/host widget, follows, join pages, statistics and instant redirects, with no browser errors or document overflow. The push regression passed explicit permission, service-worker registration, encrypted subscription, synchronized signup/header controls and device revocation through `/settings/notifications`. Browser push provisioning and the external provider were intercepted; real devices were not contacted.

Frontend: zero Svelte errors/warnings, 25 unit tests, Cloudflare and Docker/Node builds. Docker runtime regression passed SSR/session behavior, five locales, assets/icons, hydration, appearance and mobile. Backend: typecheck, 170 unit tests, nine dashboard tests, build, and all 12 API security/concurrency integration tests (127 assertions). Bot: typecheck and 71 tests.

Screenshots and structured interaction results are in [`output/playwright/widget-ux`](../output/playwright/widget-ux). The fixture token is kept outside the repository. `test:widgets:ui` restores only its own fixture preferences; its guarded database is `trptools_engagement_test`.

## Worker CPU recheck

The compiled frontend and API ran in isolated local `workerd` processes. macOS scheduled user/system CPU counters measured 50 warm requests per case after 15 warmups, with all 12 user and 13 host widgets enabled. No sample exceeded 10ms.

| Page | API maximum | SSR maximum |
| --- | ---: | ---: |
| User homepage | 1.61ms | 1.87ms |
| Host homepage | 1.75ms | 2.17ms |
| Statistics | 1.67ms | 2.10ms |

The first user SSR request took 4.97ms. These are local scheduled CPU measurements including process overhead, excluding network waits; they are not production Cloudflare billing counters. Full measurements are in [`widget-ux-page-cpu-results.json`](widget-ux-page-cpu-results.json). Widgets still use the existing single homepage bootstrap, with no per-widget database/Redis request. Calendar date formatters are bounded and reused.

## Local demo

The complete isolated stack remains running. Open <http://localhost:3002> for the demo login, then <http://localhost:3000>. From `Project`, stop it with `./dev.sh down` and apply database migrations with `./dev.sh migrate`. This UI update adds no migration.
