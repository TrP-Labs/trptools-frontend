import { describe, expect, test } from 'bun:test';
import { serviceBindingFetcher } from '../src/lib/api/serviceBinding';

describe('Cloudflare backend service binding', () => {
	test('uses the ordinary fetcher when no binding exists', () => {
		const fallback = (() => Promise.resolve(new Response())) as typeof fetch;
		expect(serviceBindingFetcher(fallback)).toBe(fallback);
	});

	test('preserves the complete request while routing it through the binding', async () => {
		let received: Request | undefined;
		const service = {
			async fetch(request: Request) {
				received = request;
				return Response.json({ ok: true });
			}
		};
		const fallback = (() => {
			throw new Error('public fetch must not run');
		}) as typeof fetch;

		const response = await serviceBindingFetcher(fallback, service)(
			'https://backend.internal/groups/42',
			{
				method: 'POST',
				headers: { cookie: 'access_token=session', 'x-request-id': 'test' },
				body: 'payload'
			}
		);

		expect(await response.json()).toEqual({ ok: true });
		expect(received?.url).toBe('https://backend.internal/groups/42');
		expect(received?.method).toBe('POST');
		expect(received?.headers.get('cookie')).toBe('access_token=session');
		expect(received?.headers.get('x-request-id')).toBe('test');
		expect(await received?.text()).toBe('payload');
	});
});
