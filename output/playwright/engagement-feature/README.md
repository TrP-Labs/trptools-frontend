# Engagement visual verification

Captured from the production Docker frontend against isolated PostgreSQL/Valkey fixtures. Automated Chromium checks passed 28 captures at 1440, 375 and 320 pixels, with no browser errors or horizontal document overflow. All 12 user widgets and 13 host widgets were rendered. Add/reorder/save/reload, mode switching, follow/unfollow and instant redirects were checked.

The enabled-reminders capture uses the production frontend with notification API requests routed to the configured local Worker. Real browser permission, service-worker registration, encrypted subscription persistence and device revocation were checked; only browser push provisioning and the external provider were replaced. No real reminder or external join message was sent.

See the sibling backend `docs/engagement-verification.md` for storage, API, Worker CPU and runtime validation, including the unconfirmed strict 10 ms homepage budget. Screenshots contain only owned test fixtures.

- [User homepage](home-user-desktop.png)
- [Host homepage](home-host-desktop.png)
- [All user widgets on mobile](all-widgets-user-375.png)
- [All host widgets on mobile](all-widgets-host-375.png)
- [Mobile widget picker](widget-picker-375.png)
- [Mobile shift and gentle prompt](shift-375.png)
- [Enabled reminders](shift-reminders-enabled-375.png)
- [Mobile external confirmation](join-320.png)
- [Mobile statistics](statistics-375.png)
