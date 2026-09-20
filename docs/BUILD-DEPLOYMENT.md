# Frontend build and deployment

## Production shape

The default SvelteKit target is `@sveltejs/adapter-cloudflare`. One deployment
contains the SSR Worker and 198 immutable static assets. Wrangler currently
reports an approximately 1.8 MiB uncompressed / 428 KiB gzip Worker upload;
browser downloads are route-split and are not that entire number.

`wrangler.jsonc` defines four important runtime decisions:

1. `nodejs_als` supplies the AsyncLocalStorage semantics Paraglide uses to keep
   concurrent request locales isolated. It does not enable the full Node.js
   compatibility layer.
2. `ASSETS` serves SvelteKit's generated client files through Workers Static
   Assets. Requests for immutable files do not need application SSR.
3. `BACKEND` binds to the `trptools-backend` Worker. All server-side Eden calls
   use that binding, while browser calls and SSE use `PUBLIC_API_URL`.
4. Smart Placement lets Cloudflare place dynamic execution nearer the backend's
   Neon/Upstash data path when that saves more time than running at the user's
   nearest point of presence. Static assets remain edge-served.

The binding is optional in application types so the same code works under the
local and Node adapters. If it is absent, SSR falls back to
`INTERNAL_API_URL`, then `PUBLIC_API_URL`, then localhost.

## Why the service binding matters

A signed-in page ordinarily has at least two server-side dependency stages:
the request hook resolves `/auth/session`, then route/layout loads fetch their
data. Some dashboard pages fan out further. Moving only the frontend to the
edge would not remove that serial work; pointing each call at a public backend
hostname would add DNS, TLS, and another edge traversal to it.

The service binding removes that public hop and keeps both Workers in the same
Cloudflare request graph. The remaining latency is real application work:
Roblox permission resolution on a cache miss, Neon queries, Upstash operations,
and page-specific fan-out. Those should be measured in the backend rather than
hidden with unsafe HTML caching.

The frontend's cache rules are intentionally conservative:

- hashed `/_app/` assets are immutable and globally cacheable;
- anonymous HTML may retain a route's public policy and varies on
  `Accept-Language` and `Cookie`;
- any request carrying cookies, or any response setting a cookie, is
  `private, no-store` because session, locale, theme, and timezone change SSR;
- policy repository snapshots use Cache API storage for five minutes by
  default, plus an in-isolate cache and in-flight request deduplication.

Do not use a Cloudflare cache rule that overrides the personalized HTML policy.
If public SSR traffic becomes material, cache the public backend's stable JSON
responses with explicit surrogate keys or versioning; that yields reuse across
locales/themes without caching a rendered user's shell.

## Policies

At runtime the Worker lists the root of `TrP-Labs/Policies` through GitHub's
Contents API, validates supported `.md` and `.txt` files, and fetches raw file
content. Limits of 32 files and 128 KiB per file bound memory and network use.
Redirect files accept only root-relative and HTTP(S) destinations.

The fetch is not on every request. Cloudflare's Cache API stores the compiled
snapshot, an isolate-local cache avoids Cache API work while warm, and
concurrent refreshes share one promise. The default five-minute TTL is set with
`POLICIES_CACHE_SECONDS`. A tracked snapshot from the same repository is built
into both Worker and Node artifacts so legal pages survive GitHub failures or a
bad runtime configuration.

`POLICIES_GITHUB_TOKEN` is optional. If supplied, it is attached only to the
GitHub API listing request and never forwarded to `raw.githubusercontent.com`.

## Commands and checks

```sh
bun run test          # pure policy, service-binding, cache and packaging tests
bun run check         # backend-aware API catalogue, Svelte and TS checks
bun run worker:build  # tests, adapter build, and Wrangler deployment dry-run
bun run test:worker   # workerd SSR integration test with an isolated API
bun run worker:deploy # tests, checks, build, then production deployment
```

The workerd regression covers SSR, static assets, the bundled policy fallback,
session forwarding, locale resolution, and private response caching. The
service-binding unit test verifies that method, body, headers, and cookies are
preserved when a request is redirected through the binding. A Wrangler dry-run
validates the final upload and binding names without changing Cloudflare state.

Cloudflare's Git build clones only the frontend repository. It therefore has no
local package dependency on the sibling backend: the production import is
type-only and disappears from emitted JavaScript. Local and GitHub release
checks alias the sibling source and keep the full Eden route contract. In the
Cloudflare UI use `bun run worker:build` as the build command and
`bunx wrangler deploy --env=""` as the deploy command; deployment begins only
after tests, compilation, and the dry-run succeed.

The `Deploy Cloudflare Worker` GitHub workflow is manual and uses the protected
`production` environment. Add `CLOUDFLARE_API_TOKEN` and
`CLOUDFLARE_ACCOUNT_ID` as environment secrets. Configure `PUBLIC_API_URL` and
any policy variables on the Worker before its first deployment; `keep_vars`
preserves dashboard-managed variables on subsequent deploys. The backend Worker
must be named `trptools-backend` in the same account.

## Docker compatibility

Docker remains supported for portability and disaster recovery. It is an
explicit secondary adapter rather than an accidental second production build:

```sh
bun run build:node
docker build -t trptools-frontend:test .
bun run test:runtime trptools-frontend:test
```

`TRPTOOLS_ADAPTER=node` selects adapter-node, and the Dockerfile invokes it via
`build:node`. The runtime image contains `build/`, Bun and package metadata,
without `node_modules`. It still builds once on `BUILDPLATFORM`, then shares the
architecture-neutral output across AMD64 and ARM64 runtime images. Introducing
a native addon requires revisiting that assumption.

Bun is pinned in `.bun-version` and the Dockerfile. The standalone-install test
ensures no local `file:` dependency can reappear and break Cloudflare or Docker
installation. Existing GHCR publication and digest-promotion remain intact; a
Cloudflare migration does not have to remove the portable artifact.

The Worker and Node builds both write `.svelte-kit`, so run them serially. CI
does this deliberately. Launching both at once can race SvelteKit's generated
modules and produce a transient syntax error in otherwise valid output.

## Remaining performance work

The edge runtime itself is unlikely to be the main performance blocker after
the service binding is active. Measure these next, in order:

1. Add Server-Timing spans around session lookup, membership resolution, each
   route load, Neon, and Upstash. Cloudflare analytics alone cannot identify
   which backend stage dominates.
2. Collapse repeated session/membership reads inside one backend request graph,
   and batch independent dashboard reads where the UI always needs them
   together. A service binding makes calls cheaper, not free.
3. Confirm Neon region and Smart Placement using production traces. If most
   misses are database-bound, placement near Neon should win; if Upstash and
   permission caches absorb nearly all work, user-near execution may be faster.
4. Audit route-level browser JavaScript. The Worker bundle size does not equal
   client cost; use per-route transferred JS, hydration time, and long tasks.
5. Only then consider caching public API data. Never cache permission-derived
   or signed-in HTML in a shared cache.

Roblox remains a special external constraint. The backend's short permission
cache and credential ladder protect rate limits; moving Workers cannot remove
Roblox's own latency or quota ceilings.
