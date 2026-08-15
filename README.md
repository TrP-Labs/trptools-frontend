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
bun run check     # svelte-check
```

The build uses `adapter-node`, which runs anywhere a JS runtime does — Docker, a
VM, Bun, or a container-based edge platform. Swap the adapter in
`vite.config.ts` to target a specific serverless platform.

`PUBLIC_API_URL` is read at runtime as well as build time, so one image can be
pointed at a different backend without rebuilding.
