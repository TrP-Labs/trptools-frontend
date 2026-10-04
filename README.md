# trptools-frontend

TrPTools site, built with SvelteKit, Svelte 5, and Tailwind. Workers are the default build target; Docker uses the Node adapter on Bun.

## Audit browser regression

Run the backend's isolated `security-audit.ts` fixture with `AUDIT_UI=true`, then start this site with:

```bash
TRPTOOLS_ADAPTER=node PUBLIC_API_URL=http://localhost:54381 INTERNAL_API_URL=http://localhost:54381 bun run dev --host 127.0.0.1 --port 54382
```

The test fixture writes `/tmp/trptools-audit-ui.json`. From another terminal in this checkout:

```bash
bun run scripts/audit-state.ts
npx --package @playwright/cli playwright-cli -s=trptools-audit open http://localhost:54382 --browser chrome
npx --package @playwright/cli playwright-cli -s=trptools-audit state-load /tmp/trptools-audit-browser-state.json
npx --package @playwright/cli playwright-cli -s=trptools-audit run-code --filename scripts/audit-browser.js
mkdir -p src/routes/__audit
cp scripts/fixtures/audit-components.svelte src/routes/__audit/+page.svelte
npx --package @playwright/cli playwright-cli -s=trptools-audit run-code --filename scripts/audit-components.js
```

Always remove `src/routes/__audit/+page.svelte` and its empty directory after testing, including after a failure; the harness must not ship. The checks cover responsive pages, account-sync failures, accessible controls, keyboard selection, native lightbox focus/Escape, and profile batching/retries. Expected simulated 503 responses appear in the browser console. Screenshots go in `output/playwright/`.

## Development

1. Clone `trptools-backend` beside this repository for API type checking.
2. Run `cp .env.example .env && bun install --frozen-lockfile`.
3. Set `PUBLIC_API_URL` to your API origin and run `bun run dev`.
4. Open `http://localhost:5173`.

A standalone checkout can still build using its bundled API contract. CI checks against the sibling backend source.

## Docker

1. Follow [trptools-deploy](https://github.com/TrP-Labs/trptools-deploy) for a server install.
2. To build locally, run `docker build -t trptools-frontend .`.
3. Set `PUBLIC_API_URL` to the browser-facing API and `INTERNAL_API_URL` to the API's container address.

Origins are runtime settings, so one image works with different backends. Compose uses `INTERNAL_API_URL=http://backend:3001`; no rebuild is needed to change domains.

## Cloudflare Workers

1. Run `bun install --frozen-lockfile` and update the Worker name in `wrangler.jsonc`.
2. Deploy the backend first and set the `BACKEND` service binding to its Worker name.
3. Set `PUBLIC_API_URL` on the Worker and configure its site domain in Cloudflare.
4. Run `bun run check && bun run worker:build`, then `bun run worker:deploy` when ready.

Use `bun run worker:dev` for local development and `.dev.vars` for local variables. The **Deploy Cloudflare Worker** GitHub workflow is manual and needs `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` in its `production` environment.

For Cloudflare Builds, use `bun install --frozen-lockfile --ignore-scripts` as the build command and `bun run worker:deploy` as the deploy command. The repository builds independently; runtime variables live on the Worker.

## Footer and translations

Set `POLICIES_REPOSITORY` to your policy repository (default `TrP-Labs/Policies`); `.md` files become pages and `.txt` files become links. Both runtimes refresh the repository and retain a bundled fallback, with no mounted policy directory.

Translations come from [TrP-Labs/Locales](https://github.com/TrP-Labs/Locales). Run `./scripts/pull-locales.sh` to refresh the vendored messages.

## Checks

1. Run `bun run check && bun run worker:build` for types, messages, unit tests, and the Worker bundle.
2. Run `bun run scripts/test-worker-runtime.ts` for the local Worker runtime test.
3. Run `bun run build:node` or build the image, then `bun run test:runtime <image>` for the Docker runtime test.

Images publish for AMD64 and ARM64 on `main`; release tags promote the tested image by digest. MIT — see [LICENSE](./LICENSE).


## Personal homepages and engagement

Signed-in users can switch between user and host homepages beside the greeting.
Each mode has an independent saved widget layout; adding widgets reuses page
data. Personal shift feeds show explicitly followed groups. Group and shift
pages offer optional browser reminders, and account settings can revoke this
browser. Cosmetic join pages explain the external service before continuing;
instant redirects are an account opt-in.

The group dashboard Statistics page shows anonymous page counts, join-link CTR
and aggregate route preferences. See [visual verification](output/playwright/engagement-feature/README.md)
and the sibling backend verification report for API/security tests and CPU
measurement limits. `test:engagement:ui` and `test:engagement:push` require the
isolated fixture described there; they never use production accounts.
