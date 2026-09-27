# Host feature showcase

Typical setup: Demo Transit, an ordinary Host, 12 vehicles, 10 routed and 6 confirmed. The timeline shows an automated staff opening, a skipped optional edit, an ignored host reminder, a staff-triggered public opening, and upcoming host/dispatcher reminders. The announcement image is uploaded through local Garage.

Screenshots were captured in real Chromium against both the Docker apps and local workerd. Both browser runs passed import, upload, timer extension, event rescheduling, reminder acknowledgment and schedule save. No browser errors or horizontal overflow at 320 or 375 pixels.

| View | Docker | Workers |
| --- | --- | --- |
| Host desktop | [Screenshot](01-host-desktop.png) | [Screenshot](worker-01-host-desktop.png) |
| Host mobile | [Screenshot](02-host-mobile.png) | [Screenshot](worker-02-host-mobile.png) |
| Schedule desktop | [Screenshot](03-schedule-desktop.png) | [Screenshot](worker-03-schedule-desktop.png) |
| Schedule mobile | [Screenshot](04-schedule-mobile.png) | [Screenshot](worker-04-schedule-mobile.png) |
| Event timing controls | [Screenshot](05-event-timing.png) | [Screenshot](worker-05-event-timing.png) |
| Dispatch reminders | [Screenshot](06-dispatch-reminder.png) | [Screenshot](worker-06-dispatch-reminder.png) |
| Light theme on mobile | [Screenshot](07-host-light-mobile.png) | [Screenshot](worker-07-host-light-mobile.png) |
| Midnight theme | [Screenshot](08-host-midnight.png) | [Screenshot](worker-08-host-midnight.png) |

The JSON files beside these screenshots record browser results. Backend verification details and warm CPU measurements are in the backend's `docs/host-verification.md` and `docs/host-worker-cpu-results.json`.

All work is committed on dev. Nothing was released or deployed remotely; no live Discord messages or command registrations were sent.
