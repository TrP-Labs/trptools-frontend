#!/usr/bin/env node
/**
 * Fails if the API can answer with a message the error catalogue has no
 * translation for.
 *
 * The backend's failure messages are static string literals declared as
 * `t.Literal` in its Elysia models, which makes each one a stable error code
 * the frontend can key a translation off without the backend having to change.
 * The catch is that nothing in the type system connects the literal to
 * `src/lib/api/errors.ts` — reword one and the frontend would quietly fall back
 * to showing the English. This reads the backend's own source and says so.
 *
 * Skipped rather than failed when the backend is not checked out beside this
 * project: the two deploy separately, and a frontend-only clone must still
 * build. CI checks both out (see .github/workflows/publish.yml), so the guard
 * runs where it matters.
 *
 * Usage: node scripts/check-api-errors.mjs [path-to-backend-src]
 */
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const BACKEND = process.argv[2] ?? '../trptools-backend/src';
const CATALOGUE = 'src/lib/api/errors.ts';

if (!existsSync(BACKEND)) {
	console.log(`api-errors: no backend at ${BACKEND}, skipping.`);
	process.exit(0);
}

const files = [];
(function walk(dir) {
	for (const entry of readdirSync(dir)) {
		const path = join(dir, entry);
		if (statSync(path).isDirectory()) walk(path);
		else if (path.endsWith('.ts') && !path.endsWith('.test.ts')) files.push(path);
	}
})(BACKEND);

/**
 * Two ways a message reaches a client, because neither finds all of them:
 * most are written inline in a `status()` call, but the ones declared in a
 * model and returned through a `satisfies` alias are only literals at the
 * declaration.
 */
const RETURNED = /status\(\s*[45]\d\d\s*,\s*'([^']+)'/gs;
const DECLARED =
	/export const \w*(?:rror|nvalid|nsupported|otFound|onflict|utranked|rotected|navailable|imited|ejected|eachable)\w* = t\.Literal\('([^']+)'\)/g;

const messages = new Set();
for (const file of files) {
	const source = readFileSync(file, 'utf8');
	for (const [, text] of source.matchAll(RETURNED)) messages.add(text);
	for (const [, text] of source.matchAll(DECLARED)) messages.add(text);
}

const catalogue = readFileSync(CATALOGUE, 'utf8');
const known = new Set(
	[...catalogue.matchAll(/^\t(?:'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)"):/gm)].map(
		([, single, double]) => (single ?? double).replace(/\\(['"])/g, '$1')
	)
);
const missing = [...messages].filter((text) => !known.has(text)).sort();

if (missing.length) {
	console.error(`api-errors: ${missing.length} API message(s) missing from ${CATALOGUE}:\n`);
	for (const text of missing) console.error(`  '${text}'`);
	console.error(`\nAdd each to API_ERRORS with a matching key in messages/en.json.`);
	process.exit(1);
}

console.log(`api-errors: all ${messages.size} API messages are translated.`);
