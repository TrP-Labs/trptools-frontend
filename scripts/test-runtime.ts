import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { chromium } from 'playwright-core';
import type { SessionUser } from '../src/lib/api/types';
import { writeRuntimePolicies } from './runtime-policies';

// Exercise the shipped image, not Vite or a server that can accidentally find
// this checkout's node_modules. The API fixture makes packaging tests usable
// on pull requests without a database or real Roblox/Discord credentials.
const image = process.argv[2];
assert(image, 'Usage: bun run test:runtime <image>');
const platform = process.env.TEST_PLATFORM ? ['--platform', process.env.TEST_PLATFORM] : [];
const directory = await mkdtemp(join(tmpdir(), 'trptools-runtime-'));
const name = `trptools-runtime-${crypto.randomUUID()}`;
const errors: string[] = [];
const cookies: string[] = [];
const user = {
	userId: '00000000-0000-4000-8000-000000000001', robloxId: 1,
	createdAt: new Date('2026-01-01T00:00:00Z'), siteRank: 'user', adminMode: false,
	primaryGroupId: null, username: 'RuntimeTester', displayName: 'Runtime Tester',
	avatar: null, theme: 'dim', locale: null, timezone: 'America/Phoenix', discord: null
} satisfies SessionUser;

const api = Bun.serve({
	hostname: '0.0.0.0', port: 0,
	fetch(request) {
		const path = new URL(request.url).pathname;
		const cookie = request.headers.get('cookie') ?? '';
		const headers = {
			'access-control-allow-origin': request.headers.get('origin') ?? '*',
			'access-control-allow-credentials': 'true',
			'access-control-allow-headers': 'content-type',
			'access-control-allow-methods': 'GET, PATCH, OPTIONS'
		};
		if (request.method === 'OPTIONS') return new Response(null, { headers });
		if (path === '/auth/session') {
			cookies.push(cookie);
			return Response.json(cookie.includes('access_token=runtime-test')
				? { authenticated: true, user } : { authenticated: false }, { headers });
		}
		if (path === '/users/me/preferences') return Response.json({
			profilePublic: true, favoriteRoutesPublic: true, dislikedRoutesPublic: true,
			theme: 'dim', locale: null, timezone: user.timezone, discord: null
		}, { headers });
		if (path === '/dashboard') return new Response('Unavailable', { status: 503, headers });
		return Response.json([], { headers });
	}
});

async function docker(...args: string[]) {
	const proc = Bun.spawn(['docker', ...args], { stdout: 'pipe', stderr: 'pipe' });
	const [stdout, stderr, exitCode] = await Promise.all([
		new Response(proc.stdout).text(), new Response(proc.stderr).text(), proc.exited
	]);
	assert.equal(exitCode, 0, `docker ${args[0]}: ${stderr}`);
	return stdout.trim();
}

let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined;
try {
	await writeRuntimePolicies(directory);
	await docker('run', ...platform, '--detach', '--name', name,
		'--add-host=host.docker.internal:host-gateway',
		'--publish', '127.0.0.1::3000',
		'--env', 'ORIGIN=http://localhost:3000',
		'--env', `PUBLIC_API_URL=http://127.0.0.1:${api.port}`,
		'--env', `INTERNAL_API_URL=http://host.docker.internal:${api.port}`,
		'--volume', `${directory}:/app/policies:ro`, image);
	const port = (await docker('port', name, '3000/tcp')).split(':').at(-1);
	const origin = `http://127.0.0.1:${port}`;
	let ready = false;
	for (let attempt = 0; attempt < 60; attempt++) {
		try { ready = (await fetch(origin, { signal: AbortSignal.timeout(1000) })).ok; } catch { /* Starting. */ }
		if (ready) break;
		await Bun.sleep(500);
	}
	assert(ready, await docker('logs', name));
	for (const locale of ['en', 'de', 'fr', 'ru', 'uk']) {
		const response = await fetch(origin, { headers: { 'accept-language': locale } });
		assert.equal(response.status, 200);
		assert.match(await response.text(), new RegExp(`<html lang="${locale}"`));
	}
	const policy = await fetch(`${origin}/policies/runtime-policy`);
	assert.equal(policy.status, 200);
	assert.match(await policy.text(), /<strong>Runtime-only document\.<\/strong>/);
	assert(!(await (await fetch(origin)).text()).includes('javascript:alert'));
	const anonymous = await fetch(`${origin}/settings`, { redirect: 'manual' });
	assert.equal(anonymous.status, 303);
	const signedIn = await fetch(`${origin}/settings`, {
		headers: { cookie: 'access_token=runtime-test' }, redirect: 'manual'
	});
	assert.equal(signedIn.status, 200);
	assert.match(await signedIn.text(), /Runtime Tester/);
	assert(cookies.some((cookie) => cookie.includes('access_token=runtime-test')), 'SSR forwards the session');
	assert.equal(await docker('exec', name, 'id', '-u'), '1000');
	await docker('exec', name, 'bun', '-e',
		'if (require("node:fs").existsSync("/app/node_modules")) throw new Error("Runtime includes node_modules")');
	await docker('exec', name, 'bun', '-e',
		'if ([...new Bun.Glob("**/*.node").scanSync("/app/build")].length) throw new Error("Native addons cannot be shared across architectures")');

	const candidates = [process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE,
		'/usr/bin/google-chrome', '/usr/bin/chromium',
		'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'];
	let executablePath: string | undefined;
	for (const candidate of candidates) if (candidate && await Bun.file(candidate).exists()) {
		executablePath = candidate;
		break;
	}
	assert(executablePath, 'Set PLAYWRIGHT_CHROMIUM_EXECUTABLE to an installed Chromium browser');
	browser = await chromium.launch({ executablePath, headless: true });
	const context = await browser.newContext({ locale: 'en-US' });
	const page = await context.newPage();
	page.on('pageerror', (error) => errors.push(error.message));
	page.on('response', (response) => {
		if (response.url().startsWith(`${origin}/_app/`) && response.status() >= 400)
			errors.push(`Asset ${response.status()}: ${response.url()}`);
	});
	for (const path of ['/', '/about', '/groups', '/shifts', '/tools', '/tools/stage',
		'/tools/dispatch', '/settings/appearance', '/policies/runtime-policy']) {
		assert.equal((await page.goto(`${origin}${path}`))?.status(), 200, path);
		await page.waitForLoadState('networkidle');
		assert((await page.locator('body').innerText()).length > 50, path);
		assert(await page.locator('svg').count() > 0, `Compiled icons on ${path}`);
	}
	await page.goto(`${origin}/settings/appearance`);
	await page.getByRole('button', { name: /Light/ }).click();
	await page.waitForFunction(() => document.documentElement.classList.contains('light'));
	await page.reload();
	assert(await page.locator('html').evaluate((element) => element.classList.contains('light')));
	await page.setViewportSize({ width: 375, height: 812 });
	assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
	await context.addCookies([{ name: 'access_token', value: 'runtime-test', url: origin }]);
	for (const path of ['/settings', '/dashboard', '/shifts']) {
		assert.equal((await page.goto(`${origin}${path}`))?.status(), 200, path);
		await page.waitForLoadState('networkidle');
	}
	assert.deepEqual(errors, [], 'No hydration errors or missing client assets');
	await browser.close();
	browser = undefined;
	// A mounted policy directory is optional, and each instance must read its
	// runtime configuration instead of relying on files from the build machine.
	await docker('rm', '--force', name);
	await docker('run', ...platform, '--detach', '--name', name, '--publish', '127.0.0.1::3000', image);
	const emptyPort = (await docker('port', name, '3000/tcp')).split(':').at(-1);
	let emptyHtml = '';
	for (let attempt = 0; attempt < 60; attempt++) {
		try {
			const response = await fetch(`http://127.0.0.1:${emptyPort}`, { signal: AbortSignal.timeout(1000) });
			assert.equal(response.status, 200);
			emptyHtml = await response.text(); break;
		}
		catch { await Bun.sleep(500); }
	}
	assert.match(emptyHtml, /<html/);
	assert(!emptyHtml.includes('Runtime Policy'));
	console.log('Runtime regression passed: SSR, sessions, 5 locales, policies, icons, client hydration, appearance, mobile, and empty policy volume.');
} catch (error) {
	console.error(await docker('logs', name).catch(() => 'Container did not start.'));
	throw error;
} finally {
	await browser?.close();
	await docker('rm', '--force', name).catch(() => undefined);
	api.stop(true);
	await rm(directory, { recursive: true, force: true });
}
