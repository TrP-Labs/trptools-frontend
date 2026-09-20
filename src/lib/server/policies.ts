import { env } from '$env/dynamic/private';
import {
	compilePolicyEntries,
	type PolicyDocument,
	type PolicyEntry,
	type PolicyLink
} from './policyDocuments';
import { fetchPolicySources } from './policyRepository';

export type { PolicyDocument } from './policyDocuments';

const DEFAULT_REPOSITORY = 'TrP-Labs/Policies';
const DEFAULT_REF = 'main';
const DEFAULT_CACHE_SECONDS = 300;

type PolicyCache = {
	match(request: Request): Promise<Response | undefined>;
	put(request: Request, response: Response): Promise<void>;
};

const bundled = import.meta.glob('../../../policies/*.{md,txt}', {
	query: '?raw',
	import: 'default',
	eager: true
}) as Record<string, string>;

const fallbackEntries = compilePolicyEntries(
	Object.entries(bundled).map(([path, contents]) => ({
		name: path.split('/').at(-1) ?? path,
		contents
	}))
);

let memory: { key: string; expiresAt: number; entries: PolicyEntry[] } | undefined;
let pending: Promise<PolicyEntry[]> | undefined;

function cacheSeconds() {
	const configured = Number(env.POLICIES_CACHE_SECONDS ?? DEFAULT_CACHE_SECONDS);
	return Number.isFinite(configured) && configured >= 30
		? Math.floor(configured)
		: DEFAULT_CACHE_SECONDS;
}

function repositoryConfig() {
	const repository = env.POLICIES_REPOSITORY?.trim() || DEFAULT_REPOSITORY;
	const ref = env.POLICIES_REF?.trim() || DEFAULT_REF;
	if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository)) {
		throw new Error('POLICIES_REPOSITORY must be an owner/repository name');
	}
	if (!/^[A-Za-z0-9._/-]+$/.test(ref) || ref.includes('..')) {
		throw new Error('POLICIES_REF contains unsupported characters');
	}
	return { repository, ref };
}

function cacheRequest(repository: string, ref: string) {
	return new Request(
		`https://policies.trptools.internal/${encodeURIComponent(repository)}/${encodeURIComponent(ref)}.json`
	);
}

async function fromCache(cache: PolicyCache | undefined, request: Request) {
	if (!cache) return undefined;
	try {
		const response = await cache.match(request);
		if (!response?.ok) return undefined;
		const entries: unknown = await response.json();
		return Array.isArray(entries) ? (entries as PolicyEntry[]) : undefined;
	} catch {
		return undefined;
	}
}

async function refresh(fetcher: typeof fetch, cache?: PolicyCache) {
	const { repository, ref } = repositoryConfig();
	const key = `${repository}@${ref}`;
	const ttl = cacheSeconds();
	const request = cacheRequest(repository, ref);

	const cached = await fromCache(cache, request);
	if (cached) {
		memory = { key, expiresAt: Date.now() + ttl * 1000, entries: cached };
		return cached;
	}

	const sources = await fetchPolicySources(fetcher, repository, ref, env.POLICIES_GITHUB_TOKEN);
	const entries = compilePolicyEntries(sources);
	if (entries.length === 0) throw new Error(`${repository}@${ref} contains no usable policies`);

	memory = { key, expiresAt: Date.now() + ttl * 1000, entries };
	if (cache) {
		try {
			await cache.put(
				request,
				Response.json(entries, { headers: { 'cache-control': `public, max-age=${ttl}` } })
			);
		} catch {
			// A working repository response is still useful when the platform cache is unavailable.
		}
	}
	return entries;
}

/**
 * Resolve the current policy snapshot from TrP-Labs/Policies.
 *
 * A Worker cache shares it within a Cloudflare location; the in-memory layer
 * deduplicates concurrent cold requests. The bundled snapshot keeps legal
 * pages available when GitHub is unreachable.
 */
export async function policies(fetcher: typeof fetch, cache?: PolicyCache): Promise<PolicyEntry[]> {
	let key: string;
	try {
		const { repository, ref } = repositoryConfig();
		key = `${repository}@${ref}`;
	} catch (error) {
		console.error('[policies]', error);
		return fallbackEntries;
	}

	if (memory?.key === key && memory.expiresAt > Date.now()) return memory.entries;
	if (pending) return pending;

	pending = refresh(fetcher, cache)
		.catch((error) => {
			console.error('[policies]', error);
			return memory?.key === key ? memory.entries : fallbackEntries;
		})
		.finally(() => {
			pending = undefined;
		});
	return pending;
}

export function policyLinks(entries: PolicyEntry[]): PolicyLink[] {
	return entries.map(({ label, href, external }) => ({ label, href, external }));
}

export function policyDocument(
	entries: PolicyEntry[],
	slug: string
): { label: string; document: PolicyDocument } | null {
	const entry = entries.find((candidate) => candidate.slug === slug && candidate.document);
	return entry?.document ? { label: entry.label, document: entry.document } : null;
}
