import type { SessionUser } from '$lib/api/types';

declare global {
	namespace App {
		interface Locals {
			/** Resolved once per request in hooks.server.ts. */
			user: SessionUser | null;
			theme: string;
		}

		interface PageData {
			user?: SessionUser | null;
			theme?: string;
		}

		interface Error {
			message: string;
			code?: string;
		}
	}
}

export {};
