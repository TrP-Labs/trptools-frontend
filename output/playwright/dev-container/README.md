# Docker development demo verification

Verified on September 29, 2026 (America/Phoenix), against the isolated
`trptools-dev` Compose stack at localhost:3000/3001, with demo login at 3002.

- The HttpOnly demo login lands on the authenticated user home.
- The explicit follow and canonical recurring signup appear in user widgets.
- User home was checked at 1440 pixels; host home at 375 pixels.
- Group statistics renders sample traffic, live background counter updates,
  join-link CTR and the custom EXPRESS route's five-vote aggregate.
- Statistics and cosmetic Discord join pages were checked at 375 pixels;
  statistics was also checked at 320 and 1440 pixels after the layout fix.
- No document overflow or browser console errors. The join destination was
  not visited. Its invitation is illustrative.
- Reminder state reports a configured VAPID public key and the demo follow.
  This run does not contact a push provider or connect the Discord bot.

The custom route's vote detail moves below its summary on narrow screens,
leaving enough room for the score and preference bar. Captures reflect the
final running Docker image. Frontend checks: zero errors/warnings, 25 tests
passed; the rebuilt adapter-node Docker image starts successfully.

Local workerd CPU evidence for both home modes and statistics is retained
separately in the backend's `docs/engagement-page-cpu-results.json`.
