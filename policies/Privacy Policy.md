# Privacy Policy

This describes what TrP Tools stores about you, why, and what you can do about
it. It covers this deployment of the site only.

## What we store

**Your Roblox identity.** Your Roblox user id, and a cached copy of your
username, display name and avatar so pages render without waiting on Roblox.
The cache refreshes roughly twice a day.

**Roblox authorisation.** The access and refresh tokens Roblox issues when you
sign in, encrypted at rest. They are used to read the group memberships your
permissions are derived from, and nothing else.

**Sessions.** One record per signed-in browser, holding an expiry and
optionally the user agent and IP address it was created from. The session token
itself is never stored — only a SHA-256 hash of it, so the database cannot be
used to impersonate you.

**Preferences.** Your theme, locale, timezone, whether your profile is public,
and which routes you have marked as favourite or disliked.

**Activity.** Shift signups, dispatch actions taken during a shift, stage
programmes you save, reports you file and API keys you create. API keys are
stored hashed and shown to you exactly once.

**Uploads.** Images you upload for groups, routes and depots, in
S3-compatible storage.

We do not ask for your email address, your real name, or any payment details.

## Cookies

- `access_token` — your session. Required to stay signed in.
- `theme` — which of the three themes this device uses.
- Two short-lived cookies during sign-in, which hold OAuth state for ten
  minutes and protect the login against forgery.

There are no analytics, advertising or third-party tracking cookies.

## How it is used

Your data is used to run the service: to work out what you may do in each
group, to render pages, to schedule shifts, to run dispatch rooms, and to
moderate content that gets reported. It is not sold, rented, or used to profile
you or advertise to you.

## Who sees it

- **Roblox**, when we look up your identity, avatar or group membership.
- **Group staff**, who can see the signups and dispatch activity for their own
  group.
- **Anyone**, for the parts a group has chosen to publish, and for your profile
  if you have left it public.
- **Site administrators**, when moderating reported content or accounts.

## Retention

Sessions expire on their own and are deleted once they do. Signing out deletes
the session immediately. Reports and moderation decisions are kept so
administrators can see a history. Everything else stays until you or the group
that owns it removes it.

## Your choices

- Make your profile private in **Settings → Account**.
- Sign out of every device at once from the same page.
- Revoke API keys in **Settings → API keys**.
- Withdraw the app's access from your Roblox account settings at any time.
- Ask the site administrators to delete your TrP Tools account and its data.

## Changes

This policy may change. The version on this page is the current one.

## Contact

Questions about your data go to the site administrators through the TrP
community channels.
