import { describe, expect, test } from 'bun:test';
import { compilePolicyEntries, policySlug } from '../src/lib/server/policyDocuments';
import { fetchPolicySources } from '../src/lib/server/policyRepository';

describe('policy documents', () => {
	test('compiles headings into cards and sorts links by file name', () => {
		const entries = compilePolicyEntries([
			{ name: 'Terms.md', contents: '# Terms\nIntro.\n## Conduct\nBe kind.' },
			{ name: 'About.txt', contents: 'https://trptools.app/about\n' }
		]);

		expect(entries.map(({ label }) => label)).toEqual(['About', 'Terms']);
		expect(entries[0]).toMatchObject({ href: 'https://trptools.app/about', external: true });
		expect(entries[1]?.document).toEqual({
			title: 'Terms',
			sections: [
				{ title: null, html: '<p>Intro.</p>\n' },
				{ title: 'Conduct', html: '<p>Be kind.</p>\n' }
			]
		});
	});

	test('refuses unsafe redirects and keeps the first colliding document', () => {
		const entries = compilePolicyEntries([
			{ name: 'Bad.txt', contents: 'javascript:alert(1)' },
			{ name: 'Privacy Policy.md', contents: '# First' },
			{ name: 'Privacy--Policy.md', contents: '# Second' }
		]);

		expect(entries).toHaveLength(1);
		expect(entries[0]?.document?.title).toBe('First');
		expect(policySlug(' Приватність / Privacy ')).toBe('приватність-privacy');
	});
});

describe('policy repository', () => {
	test('discovers supported root files and does not send the token to raw content', async () => {
		const requests: Request[] = [];
		const fetcher = (async (input: string | URL | Request, init?: RequestInit) => {
			const request = new Request(input, init);
			requests.push(request);
			if (request.url.startsWith('https://api.github.com/')) {
				return Response.json([
					{
						name: 'Terms.md',
						type: 'file',
						size: 12,
						download_url: 'https://raw.githubusercontent.com/TrP-Labs/Policies/main/Terms.md'
					},
					{
						name: 'ignored.json',
						type: 'file',
						size: 2,
						download_url: 'https://raw.githubusercontent.com/TrP-Labs/Policies/main/ignored.json'
					}
				]);
			}
			return new Response('# Terms');
		}) as typeof fetch;

		const sources = await fetchPolicySources(fetcher, 'TrP-Labs/Policies', 'main', 'secret');
		expect(sources).toEqual([{ name: 'Terms.md', contents: '# Terms' }]);
		expect(requests[0]?.headers.get('authorization')).toBe('Bearer secret');
		expect(requests[1]?.headers.get('authorization')).toBeNull();
	});

	test('rejects an oversized body even when GitHub reports a safe size', async () => {
		const fetcher = (async (input: string | URL | Request) => {
			const url = input.toString();
			if (url.startsWith('https://api.github.com/')) {
				return Response.json([
					{
						name: 'Terms.md',
						type: 'file',
						size: 1,
						download_url: 'https://raw.githubusercontent.com/example/Terms.md'
					}
				]);
			}
			return new Response('x'.repeat(128 * 1024 + 1));
		}) as typeof fetch;

		await expect(fetchPolicySources(fetcher, 'TrP-Labs/Policies', 'main')).rejects.toThrow(
			'is larger than'
		);
	});
});
