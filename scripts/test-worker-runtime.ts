import assert from 'node:assert/strict';
import type { SessionUser } from '../src/lib/api/types';

// Exercise workerd and the adapter output, not Vite's Node development server.
// The local environment deliberately has no service binding so it can use this
// isolated API fixture; service-binding request preservation has its own unit test.
const cookies: string[] = [];
const user = {
	userId: '00000000-0000-4000-8000-000000000001',
	robloxId: 1,
	createdAt: new Date('2026-01-01T00:00:00Z'),
	siteRank: 'user',
	adminMode: false,
	primaryGroupId: null,
	username: 'WorkerTester',
	displayName: 'Worker Tester',
	avatar: null,
	theme: 'dim',
	locale: null,
	timezone: 'America/Phoenix',
	discord: null
} satisfies SessionUser;

const api = Bun.serve({
	hostname: '127.0.0.1',
	port: 0,
	fetch(request) {
		const path = new URL(request.url).pathname;
		const cookie = request.headers.get('cookie') ?? '';
		const headers = {
			'access-control-allow-origin': request.headers.get('origin') ?? '*',
			'access-control-allow-credentials': 'true'
		};
		if (path === '/auth/session') {
			cookies.push(cookie);
			return Response.json(
				cookie.includes('access_token=worker-test')
					? { authenticated: true, user }
					: { authenticated: false },
				{ headers }
			);
		}
		if (path === '/users/me/preferences') {
			return Response.json(
				{
					profilePublic: true,
					favoriteRoutesPublic: true,
					dislikedRoutesPublic: true,
					theme: 'dim',
					locale: null,
					timezone: user.timezone,
					discord: null
				},
				{ headers }
			);
		}
		if (path === '/dashboard') return new Response('Unavailable', { status: 503, headers });
		return Response.json([], { headers });
	}
});

const frontendPort = 20_000 + Math.floor(Math.random() * 20_000);
const apiOrigin = `http://127.0.0.1:${api.port}`;
const origin = `http://127.0.0.1:${frontendPort}`;
let output = '';
const worker = Bun.spawn(
	[
		'./node_modules/.bin/wrangler',
		'dev',
		'--env',
		'local',
		'--ip',
		'127.0.0.1',
		'--port',
		String(frontendPort),
		'--var',
		`PUBLIC_API_URL:${apiOrigin}`,
		'--var',
		`INTERNAL_API_URL:${apiOrigin}`,
		'--var',
		'POLICIES_REPOSITORY:invalid'
	],
	{
		stdout: 'pipe',
		stderr: 'pipe',
		env: {
			...process.env,
			WRANGLER_LOG_PATH: '/tmp/trptools-frontend-worker-test.log'
		}
	}
);

async function capture(stream: ReadableStream<Uint8Array>) {
	for await (const chunk of stream) output += new TextDecoder().decode(chunk);
}
const outputDone = Promise.all([capture(worker.stdout), capture(worker.stderr)]);

try {
	let ready = false;
	for (let attempt = 0; attempt < 120; attempt++) {
		try {
			ready = (await fetch(origin, { signal: AbortSignal.timeout(500) })).ok;
		} catch {
			// workerd is still starting.
		}
		if (ready) break;
		if (worker.exitCode !== null) break;
		await Bun.sleep(100);
	}
	assert(ready, `Worker did not start.\n${output}`);

	const anonymous = await fetch(origin, { headers: { 'accept-language': 'de' } });
	assert.equal(anonymous.status, 200);
	const html = await anonymous.text();
	assert.match(html, /<html lang="de"/);
	assert.match(anonymous.headers.get('vary') ?? '', /Accept-Language/);
	assert.match(anonymous.headers.get('vary') ?? '', /Cookie/);

	const assetPath = html.match(/\/_app\/immutable\/[^"']+/)?.[0];
	assert(assetPath, 'SSR did not reference a compiled client asset');
	assert.equal((await fetch(`${origin}${assetPath}`)).status, 200);

	const policy = await fetch(`${origin}/policies/privacy-policy`);
	assert.equal(policy.status, 200);
	assert.match(await policy.text(), /Privacy Policy/);

	const signedIn = await fetch(`${origin}/settings`, {
		headers: { cookie: 'access_token=worker-test' },
		redirect: 'manual'
	});
	assert.equal(signedIn.status, 200);
	assert.match(await signedIn.text(), /Worker Tester/);
	assert.equal(signedIn.headers.get('cache-control'), 'private, no-store');
	assert(
		cookies.some((cookie) => cookie.includes('access_token=worker-test')),
		'Worker SSR did not forward the session cookie'
	);

	console.log('Worker runtime regression passed: workerd SSR, assets, policies, sessions, locale, and cache isolation.');
} catch (error) {
	console.error(output);
	throw error;
} finally {
	worker.kill('SIGTERM');
	await worker.exited;
	await outputDone;
	api.stop(true);
}
