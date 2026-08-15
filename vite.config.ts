import tailwindcss from '@tailwindcss/vite';
import adapter from '@sveltejs/adapter-node';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [
		tailwindcss(),
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
