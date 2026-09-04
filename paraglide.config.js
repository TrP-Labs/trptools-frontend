/**
 * Paraglide compiler options, in one place because two things compile the
 * messages and they must agree exactly.
 *
 * `vite.config.ts` compiles them through the plugin on every dev boot and
 * build; `scripts/messages.mjs` compiles them for `bun run check`, which needs
 * the output to exist before `svelte-check` can see it but must not pay for a
 * full Vite build.
 *
 * They used to disagree. `bun run messages` called the `paraglide-js compile`
 * CLI, which does not read `vite.config.ts` and has no flag for `cookieName` at
 * all — so it emitted a runtime looking for a `PARAGLIDE_LOCALE` cookie with a
 * `globalVariable` strategy, while the dev server emitted one looking for
 * `locale` with `preferredLanguage`. Whichever ran last won. That is why
 * `Accept-Language` silently stopped being consulted, and why a half-overwritten
 * output directory once left `_index.js` importing an `en.js` that the other
 * compiler had never written.
 */

/** @type {import('@inlang/paraglide-js').CompilerOptions} */
export const paraglide = {
	project: './project.inlang',
	outdir: './src/lib/paraglide',

	// The cookie a device's choice lives in, read first so it beats everything.
	// `preferredLanguage` is what makes the Automatic setting mean anything: with
	// no cookie, the browser's `Accept-Language` decides. `baseLocale` is the
	// floor. No `url` strategy — locale-prefixed paths are a separate decision,
	// and the patterns are generated ready for it either way.
	strategy: ['cookie', 'preferredLanguage', 'baseLocale'],
	cookieName: 'locale',

	emitTsDeclarations: true
};
