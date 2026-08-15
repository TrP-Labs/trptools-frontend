import { treaty } from '@elysiajs/eden';
import { env as privateEnv } from '$env/dynamic/private';
import { env as publicEnv } from '$env/dynamic/public';
import type { App } from 'trptools-backend';
import { strip } from './client';

/**
 * Server-only API access.
 *
 * This lives apart from the browser client because it reads the private
 * environment, which SvelteKit refuses to bundle for the client.
 *
 * The origin differs from `PUBLIC_API_URL` on purpose. On a container network
 * the backend is reachable at its service name, while the public URL is
 * whatever the browser must use from outside — pointing server-side requests
 * at the public URL would make the frontend container call back into itself.
 */
export function serverApiUrl(): string {
	return strip(
		privateEnv.INTERNAL_API_URL || publicEnv.PUBLIC_API_URL || 'http://localhost:3001'
	);
}

/**
 * A client bound to an incoming request.
 *
 * There is no ambient cookie jar during SSR, so the caller's cookies are
 * forwarded explicitly for the backend to see the session.
 */
export function serverApi(event: { request: Request; fetch: typeof fetch }) {
	const cookie = event.request.headers.get('cookie');

	return treaty<App>(serverApiUrl(), {
		fetcher: event.fetch,
		headers: cookie ? { cookie } : undefined
	});
}
