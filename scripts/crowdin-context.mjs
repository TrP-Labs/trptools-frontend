#!/usr/bin/env node
/**
 * Works out where each string appears, and writes it into a Crowdin context
 * file so translators see it beside the string.
 *
 * A translator's two questions are "where is this?" and "what kind of thing is
 * it?" — a field label has a length budget a toast does not, and a word that is
 * a noun on a button may be a verb in a sentence. Neither is answerable from a
 * key and a string alone, and both are derivable from the source.
 *
 * It fills `ai_context`, not `context`. For a file-based project `context` is
 * what Crowdin derives from the source file — `common_color` currently holds
 * " -> common_color" — and it is rewritten on every source upload, which here
 * happens on every push to the Locales repository. Anything written there would
 * quietly disappear. `ai_context` is a separate field with its own lifecycle
 * and its own reset command.
 *
 * Usage:
 *   cd ../Locales
 *   crowdin context download --to=crowdin-context.jsonl
 *   node ../trptools-frontend/scripts/crowdin-context.mjs crowdin-context.jsonl
 *   crowdin context upload --dryrun     # read it, then run it for real
 *
 * With no argument it prints what it would write, which is the quickest way to
 * see the wording without touching Crowdin at all.
 */
import { readdirSync, readFileSync, writeFileSync, statSync, existsSync } from 'node:fs';
import { join, extname, relative, dirname, resolve } from 'node:path';

const JSONL = process.argv[2];
const SRC = 'src';
const MESSAGES = 'messages/en.json';

// ----------------------------------------------------------------- file walk

const files = [];
(function walk(dir) {
	for (const entry of readdirSync(dir).sort()) {
		// The generated output references every message; including it would make
		// every string look like it appears everywhere.
		if (entry === 'paraglide') continue;
		const path = join(dir, entry);
		if (statSync(path).isDirectory()) walk(path);
		else if (['.svelte', '.ts'].includes(extname(path))) files.push(path);
	}
})(SRC);

const source = new Map(files.map((f) => [f, readFileSync(f, 'utf8')]));
const keys = new Set(Object.keys(JSON.parse(readFileSync(MESSAGES, 'utf8'))).filter((k) => k !== '$schema'));

// ------------------------------------------------------------- import graph

/**
 * Resolves an import specifier to a file in this project, or null for a
 * package.
 *
 * The extension dance matters: `$lib/stores/toast.svelte` ends in `.svelte` but
 * the file on disk is `toast.svelte.ts`, so a resolver that trusts the
 * extension it was given loses every store.
 */
function resolveImport(from, spec) {
	let base;
	if (spec.startsWith('$lib/')) base = join(SRC, 'lib', spec.slice('$lib/'.length));
	else if (spec.startsWith('./') || spec.startsWith('../')) base = resolve(dirname(from), spec);
	else return null;

	base = relative('.', base);
	for (const candidate of [base, `${base}.ts`, `${base}.js`, `${base}.svelte`, join(base, 'index.ts')]) {
		if (source.has(candidate)) return candidate;
	}
	return null;
}

const imports = new Map();
for (const [file, text] of source) {
	const found = new Set();
	for (const [, spec] of text.matchAll(/(?:from|import)\s+['"]([^'"]+)['"]/g)) {
		const target = resolveImport(file, spec);
		if (target) found.add(target);
	}
	imports.set(file, found);
}

/** The URL a route file serves, with SvelteKit's own parameter syntax kept. */
function routeUrl(file) {
	const rel = relative(join(SRC, 'routes'), file).replace(/\\/g, '/');
	const parts = rel.split('/').filter((p) => !p.startsWith('+'));
	return '/' + parts.join('/');
}

// Every route entry point, and everything it can reach.
const reaches = new Map(); // file -> Set of route URLs
for (const file of files) {
	if (!file.startsWith(join(SRC, 'routes'))) continue;
	if (!/[/\\]\+(page|layout|error)(\.server)?\.(svelte|ts)$/.test(file)) continue;

	const url = routeUrl(file);
	const seen = new Set();
	const stack = [file];
	while (stack.length) {
		const current = stack.pop();
		if (seen.has(current)) continue;
		seen.add(current);
		if (!reaches.has(current)) reaches.set(current, new Set());
		reaches.get(current).add(url);
		for (const next of imports.get(current) ?? []) stack.push(next);
	}
}

// ----------------------------------------------------------------- the role

/** What kind of thing the string is, from the construct that encloses it. */
const ROLES = [
	[/<title>[^<]*$/, 'Browser tab title'],
	[/<meta\s+name="description"\s+content=\{$/, 'Search-engine description'],
	[/\b(aria-label)=\{$/, 'Accessibility label, never shown on screen'],
	[/\b(placeholder)=\{$/, 'Placeholder text inside an empty input'],
	[/\b(hint)=\{$/, 'Hint under a form field'],
	[/\b(label)[=:]\s*\{?$/, 'Field or control label'],
	[/\b(title)[=:]\s*\{?$/, 'Page or card title'],
	[/\b(description)[=:]\s*\{?$/, 'Description under a title'],
	[/toasts\.(success|error|info|warning)\(\s*$/, 'Toast notification'],
	[/errorMessage\([^,]*,\s*$/, 'Fallback when the server gives no reason'],
	[/confirm\(\s*$/, 'Confirmation dialog, asked before something irreversible']
];

function roleOf(text, index) {
	const before = text.slice(Math.max(0, index - 60), index);
	for (const [pattern, role] of ROLES) if (pattern.test(before)) return role;
	return null;
}

// --------------------------------------------------------------- collection

const usage = new Map(); // key -> { files:Set, routes:Set, roles:Set }

for (const [file, text] of source) {
	for (const match of text.matchAll(/\bm\.([a-z][a-z0-9_]*)/g)) {
		const key = match[1];
		if (!keys.has(key)) continue; // filters `.px`, `.ring` and friends

		if (!usage.has(key)) usage.set(key, { files: new Set(), routes: new Set(), roles: new Set() });
		const entry = usage.get(key);
		entry.files.add(file);
		for (const url of reaches.get(file) ?? []) entry.routes.add(url);
		const role = roleOf(text, match.index);
		if (role) entry.roles.add(role);
	}
}

// ------------------------------------------------------------------ wording

const list = (items) =>
	items.length <= 1
		? (items[0] ?? '')
		: `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;

/**
 * The one component a key comes from, when every use of it is in that component.
 *
 * Only then is naming it true. A string used both in a shared component and
 * directly in a page would otherwise be described as living somewhere it only
 * half lives, which is worse than not saying.
 */
function componentOf(entry) {
	const files = [...entry.files];
	if (files.length !== 1) return null;
	if (!files[0].startsWith(join(SRC, 'lib'))) return null;
	return files[0].split('/').pop();
}

function contextFor(key, entry) {
	// The API error catalogue imports into one module that half the site reaches,
	// so its route count says something about an import rather than about the
	// string. Recognised by path, not by how many routes it reached.
	if ([...entry.files].some((f) => f.endsWith('api/errors.ts'))) {
		return 'Shown when the server refuses a request. Can appear on any page.';
	}

	const routes = [...entry.routes].sort();
	const component = componentOf(entry);
	const role = [...entry.roles][0];

	let where;
	if (routes.length === 0) {
		where = 'Not reachable from any page — this string may be unused.';
	} else if (routes.length <= 3) {
		where = `Appears on ${list(routes)}.`;
	} else {
		// Beyond a few, the list stops being readable and the component is the
		// more stable fact anyway. A shared prefix is worth saying out loud.
		const prefix = routes[0].split('/')[1];
		const shared = routes.every((r) => r.split('/')[1] === prefix);
		where = shared
			? `Shared wording, used on ${routes.length} /${prefix} pages.`
			: `Shared wording, used on ${routes.length} pages across the site.`;
	}

	const inComponent = component && routes.length > 1 ? ` In ${component}.` : '';
	return [role && `${role}.`, where + inComponent].filter(Boolean).join(' ');
}

const contexts = new Map();
for (const [key, entry] of usage) contexts.set(key, contextFor(key, entry));

const dead = [...keys].filter((k) => !usage.has(k));

// ------------------------------------------------------------------- output

const buckets = { 1: 0, '2-3': 0, '4+': 0, unreachable: 0 };
for (const [, entry] of usage) {
	const n = entry.routes.size;
	if (n === 0) buckets.unreachable++;
	else if (n === 1) buckets[1]++;
	else if (n <= 3) buckets['2-3']++;
	else buckets['4+']++;
}

console.error(`messages:        ${keys.size}`);
console.error(`with a call site ${usage.size}`);
console.error(`never referenced ${dead.length}${dead.length ? ` — ${dead.slice(0, 5).join(', ')}` : ''}`);
console.error(`with a role      ${[...usage.values()].filter((e) => e.roles.size).length}`);
console.error(`route spread     ${JSON.stringify(buckets)}`);

if (!JSONL) {
	console.error('\nNo Crowdin file given — showing a sample instead.\n');
	for (const key of [...contexts.keys()].slice(0, 12)) {
		console.log(`${key}\n    ${contexts.get(key)}`);
	}
	process.exit(0);
}

if (!existsSync(JSONL)) {
	console.error(`\n${JSONL} does not exist. Run \`crowdin context download\` first.`);
	process.exit(1);
}

// Crowdin's context file is one JSON object per line. Only `ai_context` is
// touched; every other field is written back exactly as it arrived, so a line
// this script does not understand survives the round trip.
const lines = readFileSync(JSONL, 'utf8').split('\n');
let filled = 0;
let unmatched = 0;

const out = lines.map((line) => {
	if (!line.trim()) return line;

	let record;
	try {
		record = JSON.parse(line);
	} catch {
		return line;
	}

	const key = record.key ?? record.identifier ?? record.stringKey;
	const context = key && contexts.get(key);
	if (!context) {
		if (key) unmatched++;
		return line;
	}

	filled++;
	return JSON.stringify({ ...record, ai_context: context });
});

writeFileSync(JSONL, out.join('\n'));

console.error(`\nfilled ai_context on ${filled} record(s) in ${JSONL}`);
if (unmatched) console.error(`${unmatched} record(s) had no matching source key and were left alone`);
console.error(`Review with \`crowdin context upload --dryrun\`, then upload.`);
