# Frontend build and deployment improvements

## What changed

1. **Ship compiled code without `node_modules`.** All frontend libraries now
   live in `devDependencies`, so [adapter-node bundles the server imports](https://svelte.dev/docs/kit/adapter-node#Deploying). Docker
   ships the resulting server, browser assets, package manifest, and Bun runtime.
   Moving a dependency to this section does not remove its used code from the
   application: it changes how it is packaged. Runtime policy documents remain
   optional mounted files.
2. **Compile once on the builder's native CPU.** `BUILDPLATFORM` selects the Bun
   installation and Vite/Paraglide compilation platform, following Docker's
   [native build-stage approach](https://docs.docker.com/build/building/multi-platform/#cross-compilation). Both target images copy
   the same JavaScript and static files, with their own architecture's Bun base.
   No target-platform `RUN` remains, so these builds need no QEMU setup. This is
   valid because the frontend output has no native addons; the runtime test
   checks for those as well as accidentally included `node_modules`.
3. **Install reproducibly and cache useful work.** Bun is pinned to 1.4.2. The
   Docker dependency filter removes only the sibling backend type dependency
   from the manifest and lockfile, preserving all registry versions and integrity
   values before a frozen install. Ignoring install scripts avoids compiling
   translations during installation. Explicit source copies keep documentation,
   tests, and workflow edits from invalidating compilation.
4. **Promote releases instead of rebuilding.** The check job builds and tests a
   native container, exporting its BuildKit cache. Main's publish job reuses it
   for both architectures. A release workflow waits for a successful main push
   workflow with the exact commit SHA, resolves its full-SHA image tag to a digest,
   verifies both architectures, and [copies that index to version aliases](https://docs.docker.com/reference/cli/docker/buildx/imagetools/create/). This
   preserves attestations and avoids the second compilation/cache export. A cache
   miss can still require compilation in the publish job; correctness never
   depends on the cache being available. The gate queries GitHub's
   [workflow-run API](https://docs.github.com/en/rest/actions/workflow-runs#list-workflow-runs-for-a-workflow).

## Measurements

Measured locally on an ARM64 Mac with Docker Desktop. These are Docker-reported
per-platform image sizes, not browser download sizes or a guarantee of registry
billing/unpacked disk usage.

| Measurement | Result |
| --- | ---: |
| Original local ARM64 image | 188,310,956 bytes (188.3 MB) |
| Optimized ARM64 image | 45,830,001 bytes (45.8 MB) |
| Optimized AMD64 image | 45,100,202 bytes (45.1 MB) |
| ARM64 image reduction | approximately 76% |
| New frozen Docker dependency installation | 16 seconds |
| New compilation, shared by both target images | 29.7 seconds |
| Repeat build dependency/compilation steps | all cached |

Earlier published 2.8.0 AMD64 layers totaled approximately 184.37 MiB compressed:
141.41 MiB of `node_modules`, 33.22 MiB of Bun, 7.1 MiB of Alpine/runtime libraries,
and 2.63 MiB of built application. The local development install was about
582 MiB versus 109 MiB for a production-only install: approximately 81% was
development-only by that comparison. Most of the remaining production install
was the approximately 98 MiB Tabler icon source catalogue. Bundling keeps the
icons used by the app instead of shipping the entire catalogue.

The prior GitHub logs showed a roughly 51-second AMD64 compilation alongside a
516-second emulated ARM64 compilation, then another main/tag build. Cache exports
and serialized jobs extended the release further. Image size alone did not cause
the long build. The revised pipeline has not yet run on GitHub; registry transfer,
runner queues, network speed, and cache availability still affect end-to-end time.

## Regression coverage

- `bun run test`: dependency-lock preservation, pinned Bun version, release
  promotion, tag-before-main timing, failed/cancelled/timed-out main runs,
  wrong commits/events, incomplete manifests, registry errors, and invalid tags.
- `bun run check`: message compilation, translation/API checks, and Svelte/TS
  diagnostics; zero Svelte errors or warnings.
- `bun run build`: production build passes. Existing empty `chunks/env.js` and
  Vite plugin-timing diagnostics are still emitted; these also occurred before
  these changes and have not been hidden.
- Both AMD64 and ARM64 images pass the HTTP and Chromium runtime suite: SSR,
  authenticated session forwarding, five locales, Markdown policy rendering,
  unsafe policy URL exclusion, optional empty policy volume, icons, client
  hydration, asset loading, appearance persistence, mobile layout, non-root
  execution, and absence of `node_modules`/native addons. The API is a fixture;
  this does not claim live Roblox OAuth or Discord coverage.
- Backend typecheck, 106 tests, and build; bot typecheck and 36 tests pass.
- GitHub Actions expressions and workflow syntax pass actionlint.
- A temporary local registry test confirms all version aliases preserve the
  source index's exact digest, both architectures, and attestations.
- An isolated Compose deployment rebuilt the frontend and API with Postgres,
  Valkey, and MinIO; migrations and health checks passed, as did public SSR
  pages and anonymous-session/protected-route responses. It used temporary
  volumes and no real credentials. The Discord bot was not started.

To reproduce container tests on a multi-platform-capable Docker installation:

```sh
bun run test
bun run check
bun run build
docker buildx build --platform linux/amd64,linux/arm64 --load -t trptools-frontend:test .
TEST_PLATFORM=linux/arm64 bun run test:runtime trptools-frontend:test
TEST_PLATFORM=linux/amd64 bun run test:runtime trptools-frontend:test
```

Cross-architecture execution requires host emulation even though compilation
does not. The browser test needs installed Chrome/Chromium; see the README for
its executable override. Multi-platform `--load` needs a containerd image store.

## Cloud and serverless implications

A large development install is normal for a compiled frontend. It is not the
browser bundle and need not be the deployed runtime. Static frontends typically
deploy generated files to object storage/CDNs; SSR platforms deploy a server
bundle and required runtime dependencies to functions, often with a platform
[adapter](https://svelte.dev/docs/kit/adapters). They generally supply the runtime rather than requiring each app to
upload an operating system and Bun binary. Neither approach fixes unnecessarily
large client-side JavaScript automatically.

This frontend still performs SSR and reads optional policy files at runtime. A
static export is therefore not a drop-in replacement, and a Workers/serverless
adapter would require reviewing environment bindings and policy storage. The
current container remains portable across Docker hosts; API origins are runtime
environment variables and no sibling checkout is needed to build the image.
Local type-checking deliberately retains the sibling backend for Eden types.

The remaining image size is largely Bun and its base libraries. Switching
runtimes merely to save more space would introduce another compatibility change;
the largest packaging and build-time savings are already addressed here.
