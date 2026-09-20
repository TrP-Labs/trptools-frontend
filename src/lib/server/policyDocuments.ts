import { marked, type Token, type TokensList } from 'marked';

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

export interface PolicyEntry extends PolicyLink {
	slug: string;
	document: PolicyDocument | null;
}

export interface PolicySource {
	name: string;
	contents: string;
}

function compile(markdown: string): PolicyDocument {
	const source = marked.lexer(markdown);

	const render = (tokens: Token[]) => {
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

/** Only safe web URLs and root-relative paths may become footer links. */
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

/** Compile trusted repository files into the footer and policy-page snapshot. */
export function compilePolicyEntries(files: PolicySource[]): PolicyEntry[] {
	const entries: PolicyEntry[] = [];
	const taken = new Set<string>();

	for (const file of files.toSorted((a, b) => a.name.localeCompare(b.name))) {
		const extension = /\.(md|txt)$/i.exec(file.name)?.[0].toLowerCase();
		if (!extension) continue;

		const label = file.name.slice(0, -extension.length).trim();
		if (!label) continue;

		if (extension === '.txt') {
			const href = parseRedirect(file.contents);
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

		const slug = policySlug(label);
		if (taken.has(slug)) continue;
		taken.add(slug);

		entries.push({
			label,
				href: `/policies/${slug}`,
				external: false,
				slug,
				document: compile(file.contents)
			});
	}

	return entries;
}
