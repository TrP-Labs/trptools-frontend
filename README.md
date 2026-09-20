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

**How this works across two projects.** When the backend is checked out beside
the frontend, `kit.alias` resolves `trptools-backend` directly to its source.
It also pins `elysia` and `@sinclair/typebox` to this project's copies, so
TypeScript does not see two structurally identical but distinct Elysia types.

Every backend reference is an `import type` and is erased before JavaScript is
emitted. The backend is therefore not a package dependency: a Cloudflare Git
build can install this repository by itself, while local and GitHub release
checks with the sibling present retain exact route inference.

An isolated checkout can build and deploy, but the full `bun run check` contract
gate requires the sibling backend. `bun run worker:build` is its standalone
pre-deployment gate: unit tests, production build, and Wrangler dry-run.

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

The footer and policy pages are driven by the root files in
[TrP-Labs/Policies](https://github.com/TrP-Labs/Policies). Markdown files become
pages at `/policies/<file-name>`; text files contain a safe HTTP(S) or
root-relative link. The default repository and branch can be changed with
`POLICIES_REPOSITORY` and `POLICIES_REF`.

Workers refresh one validated snapshot every five minutes by default. The
Cloudflare Cache API shares it within a location and an in-isolate promise
deduplicates simultaneous cold requests. A checked-in snapshot keeps the legal
pages available if GitHub is down or rate-limited. Set `POLICIES_GITHUB_TOKEN`
only for a private fork or additional API quota; it is sent to the GitHub API,
never to the raw-content host. Change the refresh interval with
`POLICIES_CACHE_SECONDS` (minimum 30).

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

### Screenshots

`scripts/crowdin-screenshots.mjs` photographs 23 pages against a locally running
site and uploads them, asking Crowdin to tag the strings it recognises on each.
A translator then sees the real screen with their string highlighted, which
answers what written context cannot — how much room there is, and what sits next
to it.

```bash
node scripts/crowdin-screenshots.mjs --session <token> --no-upload   # look first
```

The session token comes from `bun run db:seed` in the backend; without one this
only photographs what a signed-out visitor sees, which is a small part of the
site. It drives the Chrome already on the machine through `playwright-core`,
imported on demand rather than declared as a dependency — `bun add -d
playwright-core` when you need it.

See [TRANSLATING.md](../TRANSLATING.md) for the whole workflow, including how to
add a language and how translations reach production.

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
bun run build          # production Cloudflare Worker and static assets
bun run worker:build   # tests, build, and Wrangler deployment dry-run
bun run preview        # serve the built Worker locally with workerd
bun run test:worker    # build and exercise the real Worker runtime
bun run check          # backend-aware API, Svelte, and TypeScript checks
bun run messages       # regenerate src/lib/paraglide
```

The default build uses `adapter-cloudflare`. `wrangler.jsonc` publishes the
adapter output as one Worker with immutable static assets, enables Smart
Placement, and binds SSR API traffic to the `trptools-backend` Worker as
`BACKEND`. That binding avoids public DNS, TLS, and an extra edge traversal for
every server-rendered API request. Browser API calls and the dispatch
`EventSource` still use `PUBLIC_API_URL`, because service bindings exist only
inside Workers.

Before the first deployment, create a Worker named `trptools-backend` in the
same Cloudflare account and set `PUBLIC_API_URL` as a Worker runtime variable to
its public HTTPS origin. `INTERNAL_API_URL` is only a fallback for local and
Node deployments; production SSR prefers the binding. Configure the optional
policy variables from `.env.example`, then deploy with:

```bash
bun run worker:deploy
```

For Cloudflare's Git-connected UI, set the build command to
`bun run worker:build` and the deploy command to
`bunx wrangler deploy --env=""`. The guarded build must finish before
Cloudflare runs the deploy command.

`keep_vars` is enabled, so a code deployment preserves variables configured in
the Cloudflare dashboard. A policy token, if used, must be a Worker secret.
The `local` Wrangler environment intentionally omits the service binding and
uses the two URL variables, allowing the frontend and backend to run as
separate local processes.

Cookie-derived pages are marked `private, no-store`; anonymous responses vary
on `Accept-Language` and `Cookie`. This is necessary because session, theme,
timezone, and locale all change SSR HTML. Do not add an HTML cache rule that
overrides those headers. Immutable `/_app/` assets remain globally cacheable.

Docker remains a supported secondary target rather than the production default:

```bash
bun run build:node
docker build -t trptools-frontend:test .
bun run test:runtime trptools-frontend:test
```

`TRPTOOLS_ADAPTER=node` selects `adapter-node`; the Dockerfile does this through
`bun run build:node`. `PUBLIC_API_URL` and `INTERNAL_API_URL` stay runtime
variables, so one image can still target a different backend without rebuilding.

Application libraries live in `devDependencies` because adapter-node bundles
them into the generated server. The runtime image contains `build/` and package
metadata, without `node_modules`. Keep this boundary when adding a dependency;
an intentionally external runtime dependency also needs explicit packaging.

The regression test uses an isolated API fixture and the bundled policy
snapshot, then checks SSR, session forwarding, every shipped locale, policy
fallback, client hydration, icons, appearance persistence, and mobile layout. It needs
Docker and Chrome/Chromium on the test host; set
`PLAYWRIGHT_CHROMIUM_EXECUTABLE` if the browser is installed elsewhere. No real
Roblox/Discord credentials or database are used, and test containers are removed
on completion.

The Docker build runs once on the builder's native CPU (`BUILDPLATFORM`). Its
JavaScript and static output is shared by the AMD64 and ARM64 runtime stages;
the final image uses the appropriate platform's Bun binary and does not execute
target-architecture build commands. This avoids emulating Vite and Paraglide.
Do not introduce a native addon into the output without revisiting this boundary.

Bun is pinned in `.bun-version` and Dockerfile's `BUN_VERSION` default. Update
them together. `bun run test` checks that contract and the Docker dependency
filter: only the sibling backend's type-only declaration is removed, and the
remaining install uses the frozen lockfile. No package versions are re-resolved.

CI validates the Worker bundle with Wrangler, runs it under workerd, and also
builds and browser-tests the portable container on pull requests and main.
Main publishes both architectures using that build cache, with `latest`, short
SHA, and full SHA tags. Release tags promote the exact full-SHA image digest
after its main workflow succeeds; they do not compile or export the cache again.
The main and tag workflows remain separate for `Project/release.sh`. A tag for
a commit that has not been published on main fails after a bounded wait: publish
main first, then rerun the tag workflow. Version aliases do not move `latest`.

See [build and deployment measurements](docs/BUILD-DEPLOYMENT.md) for the size
breakdown, validation, and remaining limits.
