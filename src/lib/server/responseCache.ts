/** Add values to Vary without dropping values set by SvelteKit or a route. */
function appendVary(headers: Headers, ...values: string[]) {
	const existing = (headers.get('vary') ?? '')
		.split(',')
		.map((value) => value.trim())
		.filter(Boolean);
	const names = new Map(existing.map((value) => [value.toLowerCase(), value]));
	for (const value of values) names.set(value.toLowerCase(), value);
	headers.set('vary', [...names.values()].join(', '));
}

/**
 * Keep shared edge caches from mixing cookie-derived shells between readers.
 *
 * Anonymous pages can retain a route's public cache policy. Requests carrying
 * cookies and responses that set cookies are always private because theme,
 * locale, timezone and session state all affect SSR output.
 */
export function protectPersonalizedResponse(response: Response, requestHasCookies: boolean) {
	const headers = new Headers(response.headers);
	appendVary(headers, 'Accept-Language', 'Cookie');

	if (requestHasCookies || headers.has('set-cookie')) {
		headers.set('cache-control', 'private, no-store');
	}

	return new Response(response.body, {
		status: response.status,
		statusText: response.statusText,
		headers
	});
}
