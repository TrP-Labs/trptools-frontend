import type { SessionUser } from '$lib/api/types';
import type { Locale } from '$lib/paraglide/runtime';

declare global {
	/** The frontend's package version, injected at build time by Vite. */
	const __APP_VERSION__: string;

	namespace App {
		interface Locals {
			/** Resolved once per request in hooks.server.ts. */
			user: SessionUser | null;
			theme: string;
			/** Resolved by the Paraglide middleware, for loads that need it. */
			locale: Locale;
		}

		interface PageData {
			user?: SessionUser | null;
			theme?: string;
			locale?: Locale;
		}

		interface Error {
			message: string;
			code?: string;
		}
	}
}

export {};
