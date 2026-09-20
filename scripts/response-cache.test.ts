import { describe, expect, test } from 'bun:test';
import { protectPersonalizedResponse } from '../src/lib/server/responseCache';

describe('SSR response caching', () => {
	test('keeps anonymous public caching and varies every rendered representation', () => {
		const response = protectPersonalizedResponse(
			new Response('public', {
				headers: {
					'cache-control': 'public, max-age=30, s-maxage=120',
					vary: 'Accept-Encoding'
				}
			}),
			false
		);

		expect(response.headers.get('cache-control')).toBe('public, max-age=30, s-maxage=120');
		expect(response.headers.get('vary')).toBe('Accept-Encoding, Accept-Language, Cookie');
	});

	test('makes a cookie-derived response private even when its route requested public caching', () => {
		const response = protectPersonalizedResponse(
			new Response('personalized', {
				headers: { 'cache-control': 'public, max-age=30, s-maxage=120' }
			}),
			true
		);

		expect(response.headers.get('cache-control')).toBe('private, no-store');
	});

	test('does not cache a response that creates a cookie', () => {
		const response = protectPersonalizedResponse(
			new Response(null, { headers: { 'set-cookie': 'theme=dim; Path=/' } }),
			false
		);

		expect(response.headers.get('cache-control')).toBe('private, no-store');
	});
});
