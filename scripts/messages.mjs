#!/usr/bin/env node
/**
 * Compiles the message files, using exactly the options the Vite plugin uses.
 *
 * `svelte-check` needs `src/lib/paraglide` to exist before it can type-check
 * anything that calls `m.*`, and a full Vite build to produce it would dominate
 * `bun run check`. This is the same compiler with the same options and none of
 * the bundling.
 *
 * Deliberately not the `paraglide-js compile` CLI: it cannot be given a
 * `cookieName`, so it can only ever emit a runtime that disagrees with the one
 * the dev server emits. See paraglide.config.js.
 */
import { compile } from '@inlang/paraglide-js';
import { paraglide } from '../paraglide.config.js';

await compile(paraglide);
console.log(`messages: compiled into ${paraglide.outdir}`);
