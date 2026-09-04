#!/usr/bin/env node
/**
 * Photographs the site page by page and gives the pictures to Crowdin, so a
 * translator can see the button they are translating.
 *
 * Crowdin's auto-tagging reads the text out of each image and pins every string
 * it recognises to its position on the page. A translator then gets the same
 * screen the reader will, with their string highlighted on it — which answers
 * the questions written context cannot: how much room is there, what sits next
 * to it, is this a heading or a button.
 *
 * It drives the browser already on this machine rather than downloading one:
 * `playwright-core` ships no browsers, and Chrome is not a dependency worth
 * adding to a repository that does not otherwise need it.
 *
 * The capture half needs no Crowdin credentials, so it can be run and looked at
 * on its own:
 *
 *   bun run dev                                   # in another terminal
 *   node scripts/crowdin-screenshots.mjs --session <token>
 *
 * To upload as well, export both and drop `--no-upload`:
 *
 *   export CROWDIN_PROJECT_ID=… CROWDIN_PERSONAL_TOKEN=…
 *   node scripts/crowdin-screenshots.mjs --session <token>
 *
 * Re-running replaces each screenshot in place rather than piling up copies,
 * matching on the name, so this is safe to run after every release.
 */
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Imported on demand rather than declared as a dependency.
 *
 * This script runs a handful of times a year; `playwright-core` is 13MB, and
 * making every contributor and every CI run carry it so that one localization
 * chore is one command shorter is a bad trade.
 */
let chromium;
try {
	({ chromium } = await import('playwright-core'));
} catch {
	console.error('This needs playwright-core, which is not installed:\n');
	console.error('  bun add -d playwright-core\n');
	console.error('It ships no browsers — the Chrome already on this machine is what runs.');
	process.exit(1);
}

// --------------------------------------------------------------------- config

const args = process.argv.slice(2);
const flag = (name, fallback = null) => {
	const i = args.indexOf(name);
	return i === -1 ? fallback : (args[i + 1] ?? true);
};

const BASE = flag('--base', 'http://localhost:5173');
const SESSION = flag('--session', process.env.TRPTOOLS_SESSION);
const GROUP = flag('--group', 'demo-transit');
const OUTDIR = flag('--outdir', '.screenshots');
const UPLOAD = !args.includes('--no-upload');

const PROJECT_ID = process.env.CROWDIN_PROJECT_ID;
const TOKEN = process.env.CROWDIN_PERSONAL_TOKEN;

/** Chrome first, then Chromium — whichever this machine actually has. */
const BROWSERS = [
	'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
	'/Applications/Chromium.app/Contents/MacOS/Chromium',
	'/usr/bin/google-chrome',
	'/usr/bin/chromium'
];

/**
 * The pages worth photographing, and what to call each picture in Crowdin.
 *
 * Not every route: one page per distinct screen a translator would need to
 * recognise. `:group` is filled in with --group. Pages needing a record that
 * the seed does not create are left out rather than photographed empty, since
 * an empty state teaches a translator less than no picture at all.
 */
const PAGES = [
	['Home', '/'],
	['About', '/about'],
	['Group directory', '/groups'],
	['Tools', '/tools'],
	['Stage programmer', '/tools/stage'],
	['Personal dispatch board', '/tools/dispatch'],
	['My shifts', '/shifts'],
	['Public group page', '/g/:group'],
	['Dashboard', '/dashboard'],
	['Group overview', '/dashboard/:group'],
	['Dispatch', '/dashboard/:group/dispatch'],
	['Shifts', '/dashboard/:group/shifts'],
	['Routes', '/dashboard/:group/routes'],
	['Depots', '/dashboard/:group/depots'],
	['Ranks', '/dashboard/:group/ranks'],
	['Applications', '/dashboard/:group/applications'],
	['Discord bot', '/dashboard/:group/bot'],
	['Group settings', '/dashboard/:group/settings'],
	['Account settings', '/settings'],
	['Appearance settings', '/settings/appearance'],
	['API keys', '/settings/api-keys'],
	['Site administration', '/admin'],
	['Administer accounts', '/admin/users']
];

// ---------------------------------------------------------------- the capture

function findBrowser() {
	for (const path of BROWSERS) if (existsSync(path)) return path;
	throw new Error(
		'No Chrome or Chromium found. Install one, or add its path to BROWSERS in this script.'
	);
}

async function capture() {
	mkdirSync(OUTDIR, { recursive: true });

	const browser = await chromium.launch({ executablePath: findBrowser() });
	// A wide viewport with `fullPage` gives Crowdin a tall image of the whole
	// screen rather than the fold, and the light theme is set because the text
	// extraction behind auto-tagging reads dark-on-light most reliably.
	const context = await browser.newContext({
		viewport: { width: 1440, height: 900 },
		deviceScaleFactor: 2
	});

	const url = new URL(BASE);
	const cookies = [{ name: 'theme', value: 'light', domain: url.hostname, path: '/' }];
	if (SESSION) {
		cookies.push({ name: 'access_token', value: SESSION, domain: url.hostname, path: '/' });
	}
	await context.addCookies(cookies);

	const page = await context.newPage();
	const taken = [];

	for (const [name, route] of PAGES) {
		const path = route.replace(':group', GROUP);
		try {
			const response = await page.goto(BASE + path, { waitUntil: 'networkidle', timeout: 20_000 });
			const status = response?.status() ?? 0;

			// A redirect to the sign-in page means the session was not accepted;
			// photographing it would file the login screen under twenty names.
			if (page.url().includes('/login') && path !== '/login') {
				console.error(`  skipped ${name} — redirected to sign in`);
				continue;
			}
			if (status >= 400) {
				console.error(`  skipped ${name} — ${status}`);
				continue;
			}

			const file = join(OUTDIR, `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.png`);
			await page.screenshot({ path: file, fullPage: true });
			taken.push({ name, path, file });
			console.log(`  ${name}  ${path}`);
		} catch (error) {
			console.error(`  skipped ${name} — ${error.message.split('\n')[0]}`);
		}
	}

	await browser.close();
	return taken;
}

// ----------------------------------------------------------------- the upload

const api = async (path, init = {}) => {
	const response = await fetch(`https://api.crowdin.com/api/v2${path}`, {
		...init,
		headers: { Authorization: `Bearer ${TOKEN}`, ...(init.headers ?? {}) }
	});
	if (!response.ok) {
		throw new Error(`${init.method ?? 'GET'} ${path} → ${response.status} ${await response.text()}`);
	}
	return response.status === 204 ? null : response.json();
};

async function upload(taken) {
	// The one file the source strings live in. Auto-tagging is scoped to it so
	// Crowdin knows which strings it may match against.
	const files = await api(`/projects/${PROJECT_ID}/files?limit=500`);
	const source = files.data.find((f) => f.data.name.endsWith('.json'));
	if (!source) throw new Error('No JSON source file in the project — upload sources first.');

	const existing = await api(`/projects/${PROJECT_ID}/screenshots?limit=500`);
	const byName = new Map(existing.data.map((s) => [s.data.name, s.data.id]));

	for (const shot of taken) {
		const bytes = readFileSync(shot.file);
		const storage = await api('/storages', {
			method: 'POST',
			headers: {
				'Crowdin-API-FileName': encodeURIComponent(`${shot.name}.png`),
				'Content-Type': 'application/octet-stream'
			},
			body: bytes
		});

		const previous = byName.get(shot.name);
		if (previous) {
			// Replacing the image re-runs the tagging against the new one, so a
			// moved or renamed string does not keep pointing at a stale position.
			await api(`/projects/${PROJECT_ID}/screenshots/${previous}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ storageId: storage.data.id, autoTag: true, fileId: source.data.id })
			});
			console.log(`  updated ${shot.name}`);
		} else {
			await api(`/projects/${PROJECT_ID}/screenshots`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					storageId: storage.data.id,
					name: shot.name,
					autoTag: true,
					fileId: source.data.id
				})
			});
			console.log(`  added ${shot.name}`);
		}
	}
}

// ------------------------------------------------------------------------ run

if (!SESSION) {
	console.error('No session token. Signed-in pages are most of the site, so without one');
	console.error('this photographs only what a signed-out visitor sees.\n');
	console.error('Get one from `bun run db:seed` in the backend, then pass --session <token>.\n');
}

console.log(`Capturing ${PAGES.length} pages from ${BASE} into ${OUTDIR}/`);
const taken = await capture();
console.log(`\nCaptured ${taken.length} of ${PAGES.length}.`);

writeFileSync(join(OUTDIR, 'index.json'), JSON.stringify(taken, null, '\t') + '\n');

if (!UPLOAD) {
	console.log('Not uploading (--no-upload).');
} else if (!PROJECT_ID || !TOKEN) {
	console.log('\nNot uploading: set CROWDIN_PROJECT_ID and CROWDIN_PERSONAL_TOKEN to do that.');
	console.log('The images are on disk either way, so nothing is lost by looking first.');
} else {
	console.log(`\nUploading to Crowdin project ${PROJECT_ID}…`);
	await upload(taken);
	console.log('\nDone. Crowdin tags the strings it recognises; check a few in the editor.');
}
