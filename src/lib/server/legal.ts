import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { marked, type Token, type TokensList } from 'marked';
import { env } from '$env/dynamic/private';

/**
 * The terms and privacy pages, compiled from TERMS.md and PRIVACY.md read off
 * disk at startup rather than baked into the build. That lets an operator
 * mount their own policy text over `POLICIES_DIR` (a Docker volume in
 * production) and update it by editing the file and restarting the
 * container, instead of rebuilding the image.
 *
 * A deployment whose directory is missing either file has no corresponding
 * page and no footer link to one.
 */
const POLICIES_DIR = env.POLICIES_DIR || 'policies';

function read(filename: string): string | null {
	try {
		return readFileSync(join(POLICIES_DIR, filename), 'utf-8');
	} catch {
		return null;
	}
}

const FILES = { terms: 'TERMS.md', privacy: 'PRIVACY.md' } as const;

export type LegalKind = keyof typeof FILES;

/** One top-level heading and everything under it, rendered as one card. */
export interface LegalSection {
	title: string | null;
	html: string;
}

export interface LegalDocument {
	/** The document's own `# heading`, when it has one. */
	title: string | null;
	sections: LegalSection[];
}

function compile(markdown: string): LegalDocument {
	const source = marked.lexer(markdown);

	const render = (tokens: Token[]) => {
		// Reference-style links are resolved against a table hanging off the
		// full token list, which slicing it into sections would otherwise drop.
		const slice = tokens as TokensList;
		slice.links = source.links;

		return marked.parser(slice);
	};

	let title: string | null = null;
	const sections: LegalSection[] = [];
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

function load(kind: LegalKind): LegalDocument | null {
	const markdown = read(FILES[kind]);
	return markdown ? compile(markdown) : null;
}

const documents: Record<LegalKind, LegalDocument | null> = {
	terms: load('terms'),
	privacy: load('privacy')
};

/** What the footer links to. */
export const legalAvailable = {
	terms: documents.terms !== null,
	privacy: documents.privacy !== null
};

export function legalDocument(kind: LegalKind): LegalDocument | null {
	return documents[kind];
}
