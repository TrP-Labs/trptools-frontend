export interface FetchService {
	fetch(request: Request): Promise<Response>;
}

/**
 * Turn a Cloudflare service binding into the standard fetch shape Eden expects.
 *
 * Constructing the Request here is important: it keeps the caller's method,
 * body and headers intact while routing the request through Cloudflare's
 * internal network instead of resolving the public backend hostname.
 */
export function serviceBindingFetcher(
	fallback: typeof fetch,
	service?: FetchService
): typeof fetch {
	if (!service) return fallback;

	// Bun extends `typeof fetch` with a non-standard `preconnect` property in
	// the project's ambient types. Eden only calls the Web-standard function.
	return ((input, init) => service.fetch(new Request(input, init))) as typeof fetch;
}
