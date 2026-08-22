import { treaty } from '@elysiajs/eden';
import { browser } from '$app/environment';
import { env } from '$env/dynamic/public';
import type { App } from 'trptools-backend';

export const strip = (value: string) => value.replace(/\/$/, '');

/**
 * The API origin as the browser sees it.
 *
 * Read from the dynamic public env so the same build can be pointed at a
 * different backend at container start, rather than needing a rebuild.
 *
 * Server-side loads must not use this — see `$lib/api/server`.
 */
export const API_URL = strip(env.PUBLIC_API_URL ?? 'http://localhost:3001');

/**
 * Eden Treaty client for the browser.
 *
 * The backend's route types are imported directly, so a renamed field or a
 * changed status code becomes a compile error here rather than a runtime
 * surprise. `trptools-backend` is a type-only dependency — nothing from it is
 * bundled.
 */
export const api = treaty<App>(API_URL, {
	fetch: { credentials: 'include' }
});

/** The SSE endpoint, which Eden does not model. */
export function dispatchStreamUrl(roomId: string) {
	return `${API_URL}/dispatch/${encodeURIComponent(roomId)}/connect`;
}

export function loginUrl() {
	return `${API_URL}/auth/login`;
}

/**
 * Normalises an Eden error into something showable.
 *
 * The backend answers failures with a bare string literal, so most of the time
 * the value is already the message we want.
 *
 * A thrown `Error` is deliberately *not* shown. Anything reaching here that is
 * a real exception is a fault in our own code, and putting its text in a toast
 * only ever produced things like "Cannot read properties of undefined" in
 * front of a user who could do nothing with it. It goes to the console
 * instead, where it is actually useful.
 */
export function errorMessage(error: unknown, fallback = 'Something went wrong'): string {
	if (!error) return fallback;
	if (typeof error === 'string') return error;

	if (error instanceof Error) {
		console.error('[api]', error);
		return fallback;
	}

	if (typeof error === 'object') {
		const value = error as { value?: unknown; message?: unknown; status?: number };
		if (typeof value.value === 'string') return value.value;
		if (typeof value.message === 'string') return value.message;
		if (value.status === 401) return 'You need to sign in to do that';
		if (value.status === 403) return 'You do not have permission to do that';
		if (value.status === 404) return 'Not found';
	}

	return fallback;
}

export { browser };
