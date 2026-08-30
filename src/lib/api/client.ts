import { treaty } from '@elysiajs/eden';
import { m } from '$lib/paraglide/messages.js';
import { apiErrorMessage } from '$lib/api/errors';
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
 * A thrown `Error`'s *own* text is deliberately never shown. Anything reaching
 * here that is a real exception is a fault in our own code, and putting its
 * text in a toast only ever produced things like "Cannot read properties of
 * undefined" in front of a user who could do nothing with it. It goes to the
 * console instead, where it is actually useful.
 *
 * Whatever the API said is looked up in the error catalogue first, so the
 * reader sees it in their own language; a message with no translation is shown
 * as the server wrote it rather than replaced by a vaguer fallback.
 *
 * `value` is the exception to that, and has to be read *before* the `Error`
 * check rather than after it: Eden hands a failed request back as an `Error`
 * carrying the response, so testing `instanceof Error` first swallowed every
 * message the API deliberately writes for a person to read — a refused tow
 * arrived as "could not update that vehicle" while the server had said exactly
 * which vehicle was already being towed. `value` is a response body, never an
 * exception's own words, so showing it breaks nothing the rule was there for.
 */
export function errorMessage(error: unknown, fallback = m.common_something_went_wrong()): string {
	if (!error) return fallback;
	if (typeof error === 'string') return apiErrorMessage(error) ?? error;

	if (typeof error === 'object') {
		const shape = error as { value?: unknown; status?: number };
		if (typeof shape.value === 'string' && shape.value.length > 0) {
			return apiErrorMessage(shape.value) ?? shape.value;
		}
	}

	if (error instanceof Error) {
		console.error('[api]', error);
		return fallback;
	}

	if (typeof error === 'object') {
		const shape = error as { message?: unknown; status?: number };
		if (typeof shape.message === 'string') return apiErrorMessage(shape.message) ?? shape.message;
		if (shape.status === 401) return m.api_error_unauthorized();
		if (shape.status === 403) return m.api_error_forbidden();
		if (shape.status === 404) return m.api_error_not_found();
	}

	return fallback;
}

export { browser };
