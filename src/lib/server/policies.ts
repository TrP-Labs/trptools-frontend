import { readdirSync, readFileSync } from 'node:fs';
import { extname, join } from 'node:path';
import { marked, type Token, type TokensList } from 'marked';
import { env } from '$env/dynamic/private';

/**
 * The footer's right-hand bar, driven entirely by a directory of files.
 *
 * Whatever sits in `POLICIES_DIR` is what the footer offers, so an operator
 * adds, renames or removes a link by adding, renaming or removing a file —
 * no rebuild and no code change. A file's name minus its extension is its
 * label, verbatim, which is why `Privacy Policy.md` reads as "Privacy Policy".
 *
 * Two kinds:
 *   - `.md` is a document, compiled to cards and served at `/policies/<slug>`.
 *   - `.txt` holds a single URL and the footer links straight to it. This is
 *     how a deployment points at something it hosts elsewhere without having
 *     to mirror the text here.
 *
 * The directory is read once at startup rather than baked into the build: in
 * production it is a Docker volume, so editing a file and restarting the
 * container is the whole publishing workflow.
 */
const POLICIES_DIR = env.POLICIES_DIR || 'policies';

/** One top-level heading and everything under it, rendered as one card. */
export interface PolicySection {
	title: string | null;
	html: string;
}

export interface PolicyDocument {
	/** The document's own `# heading`, when it has one. */
	title: string | null;
	sections: PolicySection[];
}

/** What the footer needs to draw one link. */
export interface PolicyLink {
	/** The file name without its extension, shown as-is. */
	label: string;
	href: string;
	/** Whether the link leaves the site, so the markup can say so. */
	external: boolean;
}

interface PolicyEntry extends PolicyLink {
	slug: string;
	document: PolicyDocument | null;
}

function compile(markdown: string): PolicyDocument {
	const source = marked.lexer(markdown);

	const render = (tokens: Token[]) => {
		// Reference-style links are resolved against a table hanging off the
		// full token list, which slicing it into sections would otherwise drop.
		const slice = tokens as TokensList;
		slice.links = source.links;

		return marked.parser(slice);
	};

	let title: string | null = null;
	const sections: PolicySection[] = [];
	let current: { title: string | null; tokens: Token[] } = { title: null, tokens: [] };

	const flush = () => {
		if (current.title === null && current.tokens.length === 0) return;
		sections.push({ title: current.title, html: render(current.tokens) });
	};

	for (const token of source) {
		if (token.type !== 'heading' || token.depth > 2) {
			current.tokens.push(token);
			continue;
		}

		// The first `#` names the document; every heading above `###` opens a
		// new card, and deeper ones stay as headings inside the body.
		if (token.depth === 1 && title === null) {
			title = token.text;
			continue;
		}

		flush();
		current = { title: token.text, tokens: [] };
	}

	flush();

	return { title, sections };
}

export function policySlug(label: string): string {
	return (
		label
			.toLowerCase()
			.normalize('NFKD')
			.replace(/[^\p{Letter}\p{Number}]+/gu, '-')
			.replace(/^-+|-+$/g, '') || 'policy'
	);
}

/**
 * The destination named by a `.txt` file.
 *
 * Only absolute http(s) URLs and root-relative paths are honoured. The file is
 * operator-supplied rather than user-supplied, but a footer link is exactly
 * the place a stray `javascript:` would be worst, and refusing one costs
 * nothing.
 */
function parseRedirect(contents: string): string | null {
	const target = contents
		.split('\n')
		.map((line) => line.trim())
		.find((line) => line.length > 0 && !line.startsWith('#'));

	if (!target) return null;
	if (target.startsWith('/') && !target.startsWith('//')) return target;

	try {
		const url = new URL(target);
		return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : null;
	} catch {
		return null;
	}
}

function read(): PolicyEntry[] {
	let files: string[];

	try {
		files = readdirSync(POLICIES_DIR);
	} catch {
		// No directory is a valid deployment: the footer simply has no links.
		return [];
	}

	const entries: PolicyEntry[] = [];
	const taken = new Set<string>();

	for (const file of files.sort((a, b) => a.localeCompare(b))) {
		const extension = extname(file).toLowerCase();
		if (extension !== '.md' && extension !== '.txt') continue;

		const label = file.slice(0, -extension.length).trim();
		if (!label) continue;

		let contents: string;
		try {
			contents = readFileSync(join(POLICIES_DIR, file), 'utf-8');
		} catch {
			continue;
		}

		if (extension === '.txt') {
			const href = parseRedirect(contents);
			if (!href) continue;

			entries.push({
				label,
				href,
				external: !href.startsWith('/'),
				slug: policySlug(label),
				document: null
			});
			continue;
		}

		// Two files whose names differ only in punctuation would collide, and
		// the first one alphabetically keeps the address.
		const slug = policySlug(label);
		if (taken.has(slug)) continue;
		taken.add(slug);

		entries.push({
			label,
			href: `/policies/${slug}`,
			external: false,
			slug,
			document: compile(contents)
		});
	}

	return entries;
}

const entries = read();

/** What the footer draws, in file-name order. */
export const policyLinks: PolicyLink[] = entries.map(({ label, href, external }) => ({
	label,
	href,
	external
}));

export function policyDocument(slug: string): { label: string; document: PolicyDocument } | null {
	const entry = entries.find((candidate) => candidate.slug === slug && candidate.document);
	return entry?.document ? { label: entry.label, document: entry.document } : null;
}
