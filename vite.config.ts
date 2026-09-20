import tailwindcss from '@tailwindcss/vite';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import cloudflareAdapter from '@sveltejs/adapter-cloudflare';
import nodeAdapter from '@sveltejs/adapter-node';
import { sveltekit } from '@sveltejs/kit/vite';
import { paraglideVitePlugin } from '@inlang/paraglide-js';
import { paraglide } from './paraglide.config.js';
import { defineConfig } from 'vite';
import { version } from './package.json' with { type: 'json' };

const nodeBuild = process.env.TRPTOOLS_ADAPTER === 'node';
const backendSource = fileURLToPath(new URL('../trptools-backend/src/index.ts', import.meta.url));
const backendContract = fileURLToPath(
	new URL('./src/lib/api/backendContract.ts', import.meta.url)
);

export default defineConfig({
	// The footer shows which build is running. Baked in here so it costs no
	// filesystem read at runtime and stays correct in a container, where
	// package.json is not necessarily beside the server bundle.
	define: {
		__APP_VERSION__: JSON.stringify(version)
	},
	plugins: [
		tailwindcss(),

		// Messages compile to typed ESM functions in `src/lib/paraglide`, which
		// is generated rather than committed. Only the locales actually used
		// survive tree-shaking, so adding a language costs the browser nothing
		// until someone selects it.
		//
		// The options are shared with `scripts/messages.mjs` rather than written
		// here, because both compile the same messages into the same directory and
		// a difference between them is invisible until something stops resolving.
		paraglideVitePlugin(paraglide),

		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},

			// Workers are the production default. Keeping the Node target behind an
			// explicit switch preserves the project's Docker portability without
			// letting CI accidentally validate only the old deployment shape.
			adapter: nodeBuild ? nodeAdapter() : cloudflareAdapter(),

			// A full checkout resolves Eden's App type straight from the sibling
			// backend. Cloudflare Builds clones this repository alone, so it uses a
			// type-only fallback instead of an uninstallable file: dependency. CI
			// checks out both repositories and therefore retains the strong contract.
			alias: {
				'trptools-backend': existsSync(backendSource) ? backendSource : backendContract,
				elysia: './node_modules/elysia',
				'@sinclair/typebox': './node_modules/@sinclair/typebox'
			}
		})
	],
	ssr: {
		// rrule is published as CommonJS, so Node's ESM loader cannot see its
		// named exports during SSR. Bundling it lets Vite apply interop and
		// keeps the import sites idiomatic.
		noExternal: ['rrule']
	},
	server: {
		port: 5173
	}
});
