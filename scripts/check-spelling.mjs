#!/usr/bin/env node
/**
 * Fails if British spellings creep back into user-facing copy.
 *
 * The site's source copy is American English — the Crowdin project's source
 * locale is `en-US` and its spellcheck QA runs against the strings as they
 * arrive, so "colour" is not a style preference here but something that fails
 * a check upstream. This is the only thing that stops a single reviewer's
 * habit undoing that.
 *
 * Scope is deliberately narrow: `messages/en.json`, which is what people read.
 * Source comments, variable names and OpenAPI prose are left alone — nobody
 * translating the site ever sees them, and widening this to `src` would flag
 * `entry.favourite`, a field name whose spelling is part of an API contract.
 *
 * Usage: node scripts/check-spelling.mjs
 */
import { readFileSync } from 'node:fs';

const MESSAGES = 'messages/en.json';

/** Each entry is [pattern, what to write instead]. */
const BRITISH = [
	[/\bcolour/i, 'color'],
	[/\bfavourit/i, 'favorit'],
	[/\brecognis/i, 'recogniz'],
	[/\bgrey\b/i, 'gray'],
	[/\bcancell/i, 'cancel'],
	[/\borganis/i, 'organiz'],
	[/\bnormalis/i, 'normaliz'],
	[/\bcustomis/i, 'customiz'],
	[/\banalys(e|ed|ing)\b/i, 'analyz-'],
	[/\bbehaviour/i, 'behavior'],
	[/\blicence\b/i, 'license'],
	[/\bcentre\b/i, 'center'],
	[/\bcatalogue\b/i, 'catalog'],
	[/\bapologis/i, 'apologiz'],
	[/\bwhilst\b/i, 'while'],
	[/\bfulfil\b/i, 'fulfill'],
	[/\bjudgement\b/i, 'judgment'],
	[/\btravell/i, 'travel'],
	[/\blabell/i, 'label'],
	[/\bdialogue\b/i, 'dialog'],
	[/\bdefence\b/i, 'defense'],
	// `recolour` and friends: the compound forms a plain \bcolour\b misses.
	[/colour/i, 'color']
];

const messages = JSON.parse(readFileSync(MESSAGES, 'utf8'));
const found = [];

for (const [key, value] of Object.entries(messages)) {
	if (key === '$schema' || typeof value !== 'string') continue;

	// Keys are word_separated, and `\b` does not fire between an underscore and
	// a letter — both are word characters — so `\bfavourit` would never match
	// `settings_favourite_routes`. Give the pattern spaces to find edges at.
	const spaced = key.replace(/_/g, ' ');

	for (const [pattern, instead] of BRITISH) {
		// The key is checked as well as the value. A key is not read by anyone
		// translating, but `m.common_colour()` returning "Color" is worse than
		// either spelling used consistently.
		if (pattern.test(value)) {
			found.push([key, 'value', value, instead]);
			break;
		}
		if (pattern.test(spaced)) {
			found.push([key, 'key', key, instead]);
			break;
		}
	}
}

if (found.length) {
	console.error(`spelling: ${found.length} British spelling(s) in ${MESSAGES}:\n`);
	for (const [key, where, text, instead] of found) {
		console.error(`  ${key} (${where}) — write "${instead}"`);
		if (where === 'value') console.error(`    ${JSON.stringify(text)}`);
	}
	console.error(
		`\nFix these in TrP-Labs/Locales (locales/en/strings.jsonc), not here —` +
			`\nmessages/ is vendored. Then ./scripts/pull-locales.sh.`
	);
	process.exit(1);
}

console.log(`spelling: ${Object.keys(messages).length - 1} messages are American English.`);
