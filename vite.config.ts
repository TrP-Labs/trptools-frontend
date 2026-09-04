import tailwindcss from '@tailwindcss/vite';
import adapter from '@sveltejs/adapter-node';
import { sveltekit } from '@sveltejs/kit/vite';
import { paraglideVitePlugin } from '@inlang/paraglide-js';
import { paraglide } from './paraglide.config.js';
import { defineConfig } from 'vite';
import { version } from './package.json' with { type: 'json' };

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

			// adapter-node runs anywhere a JS runtime does: Docker, a VM, Bun,
			// or a container-based edge platform. Swap it for a platform
			// adapter to deploy to a specific serverless target.
			adapter: adapter(),

			// Eden Treaty imports the backend's `App` type across project
			// boundaries. The two projects install their own dependencies, so
			// without this TypeScript sees two structurally identical but
			// distinct `Elysia` types and refuses the handoff. Declaring the
			// aliases here rather than in tsconfig lets SvelteKit fold them
			// into its generated config instead of fighting with it.
			alias: {
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
