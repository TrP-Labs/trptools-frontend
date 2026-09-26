import assert from 'node:assert/strict';
import type { GroupDashboardData, SessionUser, ShiftsPageData } from '../src/lib/api/types';

// Exercise workerd and the adapter output, not Vite's Node development server.
// The local environment deliberately has no service binding so it can use this
// isolated API fixture; service-binding request preservation has its own unit test.
const cookies: string[] = [];
const requests: string[] = [];
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

const group = {
	id: '00000000-0000-4000-8000-000000000002', slug: 'worker-test', robloxId: '123',
	createdAt: new Date('2026-01-01T00:00:00Z'), name: 'Worker Test Group', robloxName: 'Worker Test Group',
	nameIsCustom: false, description: '', icon: null, members: 10, visibility: 'PUBLIC',
	tagline: '', about: '', sourceLocale: 'en', translations: {}, accentColor: '#4287f5',
	bannerImage: null, bannerMediaId: null, showRoutes: true, showShifts: true,
	showRoster: false, showDispatch: true, roomOpenLeadMinutes: 10, signupLeadMinutes: 1440,
	requireDiscordForSignups: false, requireDiscordForApplications: false,
	permissionLevel: 1, permissions: 1, hasOpenCloudKey: false, moderation: 'VISIBLE'
} satisfies GroupDashboardData['group'];
const occurrence = {
	eventId: 'worker-shift', name: 'Worker Scheduled Shift', translations: {}, slug: 'worker-shift',
	color: '#4287f5', start: new Date(Date.now() + 3_600_000), end: new Date(Date.now() + 7_200_000),
	groupId: group.id, groupSlug: group.slug, groupName: group.name, groupTranslations: {}, groupIcon: null,
	signedUp: false, signupsOpen: true, sheetsAvailable: true, filled: 1, capacity: 3
} satisfies ShiftsPageData['occurrences'][number];
const groupSummary = {
	id: group.id, slug: group.slug, robloxId: group.robloxId, name: group.name, icon: null,
	members: group.members, tagline: '', sourceLocale: 'en', translations: {}, accentColor: group.accentColor,
	visibility: 'PUBLIC', permissionLevel: 0, permissions: 0
} satisfies ShiftsPageData['groups'][number];

const api = Bun.serve({
	hostname: '127.0.0.1',
	port: 0,
	fetch(request) {
		const path = new URL(request.url).pathname;
		requests.push(path);
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
		if (path.startsWith('/dashboard/')) {
			if (!cookie.includes('access_token=worker-test')) return new Response('Unauthorized', { status: 401, headers });
			if (path === '/dashboard/group/worker-test') return Response.json({ user, group,
				overview: { routes: [], depots: [], shiftCount: 1, upcoming: [occurrence], applicants: [], openRoomId: null }
			} satisfies GroupDashboardData, { headers });
			if (path === '/dashboard/shifts') return Response.json({ user, groups: [groupSummary], occurrences: [occurrence] } satisfies ShiftsPageData, { headers });
			if (path === '/dashboard/groups') return Response.json({ user, groups: [] }, { headers });
			if (path === '/dashboard/home') return Response.json({ user, dashboard: {
				primaryGroupId: null, groups: [], groupTotal: 0, shifts: [], reviews: []
			} }, { headers });
		}
		if (path.startsWith('/dashboard')) return new Response('Unavailable', { status: 503, headers });
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
	for (const [path, expectedApi, expectedText] of [
		['/', '/dashboard/home', 'Worker Tester'],
		['/dashboard', '/dashboard/groups', 'Worker Tester'],
		['/dashboard/worker-test', '/dashboard/group/worker-test', 'Worker Scheduled Shift'],
		['/shifts', '/dashboard/shifts', 'Worker Scheduled Shift']
	]) {
		requests.length = 0;
		const page = await fetch(`${origin}${path}`, { headers: { cookie: 'access_token=worker-test' }, redirect: 'manual' });
		assert.equal(page.status, 200, `${path} did not render`);
		assert.match(await page.text(), new RegExp(expectedText));
		assert.deepEqual(requests, [expectedApi], `${path} repeated backend requests`);
		assert.equal(page.headers.get('cache-control'), 'private, no-store');
	}

	console.log('Worker runtime regression passed: SSR, policies, sessions, cache isolation, and one backend call per dashboard/shifts page.');
} catch (error) {
	console.error(output);
	throw error;
} finally {
	worker.kill('SIGTERM');
	await worker.exited;
	await outputDone;
	api.stop(true);
}
