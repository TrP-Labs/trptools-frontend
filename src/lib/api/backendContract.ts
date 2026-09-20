/**
 * Standalone-build fallback for the backend's type-only Eden contract.
 *
 * Normal development and CI alias `trptools-backend` directly to the sibling
 * repository, retaining full route inference. Cloudflare's Git build clones
 * only this repository, where the import is erased before runtime. Keeping the
 * fallback deliberately unopinionated lets that isolated production build
 * complete without inventing a second API schema that can drift. The full
 * `bun run check` gate still runs only where the sibling backend is present.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type App = any;
