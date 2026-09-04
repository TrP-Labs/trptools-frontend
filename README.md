# TrP Tools

The web frontend for TrP Tools 2.0. SvelteKit with Svelte 5 runes, Tailwind 4,
and an end-to-end typed API client.

## Running locally

```bash
cp .env.example .env
bun install
bun run dev
```

The site runs on `http://localhost:5173` and expects the API at the origin in
`PUBLIC_API_URL`. Start the backend first.

## Typed API access

The API client is [Eden Treaty](https://elysiajs.com/eden/overview.html), which
imports the backend's route types directly:

```ts
const { data } = await api.routes.get({ query: { groupId } });
//      ^? RouteRecord[] — inferred from the server, not redeclared here
```

A renamed field or a changed status code becomes a compile error in this project
rather than a runtime surprise.

**How this works across two projects.** `trptools-backend` is a type-only
devDependency resolved from the sibling directory. Because each project installs
its own dependencies, TypeScript would otherwise see two structurally identical
but distinct `Elysia` types and refuse the handoff, so `kit.alias` in
`vite.config.ts` pins `elysia` and `@sinclair/typebox` to this project's copies.

Every reference is an `import type` and is erased before any JavaScript is
emitted, so the backend is never bundled and the two projects remain
independently deployable — the Dockerfile drops the dependency entirely.

If you are working on the frontend without the backend checked out beside it,
`bun install --omit=dev` or removing that one devDependency is enough; only
editor type-checking depends on it.

## Layout

```
src/
  routes/                     Pages
    g/[slug]/                 Public group pages, server rendered for embeds
    groups/                   Public directory
    shifts/                   Your upcoming shifts across groups
    tools/stage/              Stage light programmer
    dashboard/[groupId]/      Overview, dispatch, shifts, routes, ranks, settings
    settings/                 Account, appearance, API keys
  lib/
    api/                      Eden client and the types derived from it
    components/
      ui/                     Buttons, fields, modals, toasts
      layout/                 Header, sidebar, user menu
      routes/                 Route badge and editor
      dispatch/               Vehicle rows
      shifts/                 Shift editor
      stage/                  Stage programmer pieces
      users/                  Avatars and user chips
    stores/                   Dispatch room connection, toasts
    utils/                    Formatting, colour, recurrence
```

Components stay small and single-purpose so pages read as composition rather
than markup. Anything reused twice moves into `lib/components`.

## Terms and privacy

`TERMS.md` and `PRIVACY.md`, read from `POLICIES_DIR` (default `./policies`) at
startup, are the terms of service and privacy policy pages. Each `##` heading
becomes a card on the page; a leading `#` names it.

Both are optional. A missing file means its page returns 404 and its footer
link disappears; add it back and restart to bring both back. Reading happens
once at startup, not per request, so **editing either file means restarting
the process** — no rebuild needed. In Docker, `POLICIES_DIR` is a volume mount
(see the root README and the setup repo), which is what lets an operator ship
their own policy text without building a custom image.

## Strings and languages

Every word the site says lives in `messages/<locale>.json` and is reached
through typed functions — `m.dashboard_shifts_delete_confirm({ shift })` rather
than a string literal. The Paraglide compiler generates them into
`src/lib/paraglide` (git-ignored, rebuilt by `bun run messages` and by every
`vite build`), so a renamed key is a compile error and only the locales a
reader actually loads reach the browser.

Translation itself happens in [Crowdin][crowdin], which syncs with
[TrP-Labs/Locales][locales] — English is pushed up when that repository
changes, and finished languages come back to it as a pull request. This
project takes them from there: `messages/` is **vendored**, not fetched at
runtime.

```bash
./scripts/pull-locales.sh                  # TrP-Labs/Locales @ prod
./scripts/pull-locales.sh your-org/Locales # or a fork
bun run messages                           # recompile, then commit messages/
```

The source there is JSONC so translators can leave each other notes; the
comments are stripped on the way in. This is deliberately unlike the policies
directory above — a policy is content an operator swaps at runtime and a
missing one costs a footer link, whereas a missing string is a blank button, so
strings are pinned to the build that expects them.

Shipping a language is a separate, deliberate step: add its tag to `locales` in
`project.inlang/settings.json`. Pulling a half-finished translation does
nothing until then, and anything untranslated falls back to English.

The locale is resolved in `hooks.server.ts` — the `locale` cookie first, then
the account's `users.locale`, then `Accept-Language`, then English — and
stamped into `<html lang>` during server rendering, the same way the theme is,
so there is no flash of the wrong language. `lib/utils/format.ts` passes the
resolved locale to every `Intl` call, so dates and numbers follow it too.

### Translator context

`scripts/crowdin-context.mjs` works out where every string appears and what
kind of control it labels, by walking the import graph from each route entry
point and reading the construct around each `m.*` reference. It writes that
into Crowdin's `ai_context`, so a translator sees "Confirmation dialog, asked
before something irreversible. Appears on /dashboard/[groupId]/depots." beside
the string.

```bash
node scripts/crowdin-context.mjs          # print what it would write
```

To apply it, from a checkout of [TrP-Labs/Locales][locales] with
`CROWDIN_PROJECT_ID` and `CROWDIN_PERSONAL_TOKEN` exported:

```bash
crowdin context download --to=crowdin-context.jsonl
node ../trptools-frontend/scripts/crowdin-context.mjs crowdin-context.jsonl
crowdin context upload --dryrun    # read it, then run without --dryrun
```

Not `context`, which for a file-based project is what Crowdin derives from the
source file and rewrites on every upload — and an upload happens on every push
to Locales, so anything written there would quietly disappear. `ai_context` has
its own lifecycle and its own `crowdin context reset`.

Re-run it after renaming keys: a rename is a delete and a create to Crowdin, so
the new strings arrive with no context.

### API errors

The backend answers failures with static string literals declared as
`t.Literal` in its Elysia models, which makes each one a stable error code the
frontend already has the type of. `lib/api/errors.ts` translates them keyed by
that literal, so **no backend change is needed to localize an API error**. A
message with no entry is shown as the server wrote it.

`scripts/check-api-errors.mjs` (part of `bun run check`) reads the backend's
source and fails if it can return a message the catalogue has no translation
for, so rewording one upstream cannot quietly drop every language back to
English.

[locales]: https://github.com/TrP-Labs/Locales
[crowdin]: https://crowdin.com/project/trp-labs

## Theming

Three themes — dim, midnight and light — are defined as CSS custom properties in
`app.css` and exposed to Tailwind through `@theme inline`. Every surface paints
from those variables, so switching theme is one class on `<html>`.

The choice is stored in a cookie and applied during server rendering, so there
is no flash of the wrong theme on load.

## Realtime dispatch

`lib/stores/dispatch.svelte.ts` holds the room connection. It uses
`EventSource` with its own exponential backoff, because the built-in retry has
no backoff and no way to stop once a room closes. The stream opens with a `SYNC`
frame carrying the full vehicle list, so a reconnect needs no replay.

Actions apply locally first and roll back if the request fails, which keeps the
table responsive under load.

## Building

```bash
bun run build     # production build
bun run preview   # serve the build
bun run check     # compile messages, check API error coverage, svelte-check
bun run messages  # recompile messages/ into src/lib/paraglide
```

The build uses `adapter-node`, which runs anywhere a JS runtime does — Docker, a
VM, Bun, or a container-based edge platform. Swap the adapter in
`vite.config.ts` to target a specific serverless platform.

`PUBLIC_API_URL` is read at runtime as well as build time, so one image can be
pointed at a different backend without rebuilding.
