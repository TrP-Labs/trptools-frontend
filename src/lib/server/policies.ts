import { env } from '$env/dynamic/private';
import {
	compilePolicyEntries,
	type PolicyDocument,
	type PolicyEntry,
	type PolicyLink
} from './policyDocuments';
import { fetchPolicySources } from './policyRepository';
import { createSnapshotCache, type Snapshot, type KeepAlive } from './snapshotCache';

export type { PolicyDocument } from './policyDocuments';

const DEFAULT_REPOSITORY = 'TrP-Labs/Policies';
const DEFAULT_REF = 'main';
const DEFAULT_CACHE_SECONDS = 300;

type PolicyCache = App.Platform['caches']['default'];

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

const snapshots = createSnapshotCache<PolicyEntry[]>();

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
	return new URL(
		`https://policies.trptools.internal/${encodeURIComponent(repository)}/${encodeURIComponent(ref)}.json`
	);
}

async function fromCache(cache: PolicyCache | undefined, request: URL): Promise<Snapshot<PolicyEntry[]> | undefined> {
	if (!cache) return undefined;
	try {
		const response = await cache.match(request);
		if (!response?.ok) return undefined;
		const body: unknown = await response.json();
		// Existing cached arrays remain useful while the new snapshot format refreshes.
		if (Array.isArray(body)) return { value: body as PolicyEntry[], expiresAt: 0 };
		if (body && typeof body === 'object' && 'value' in body && Array.isArray(body.value) &&
			'expiresAt' in body && typeof body.expiresAt === 'number' && Number.isFinite(body.expiresAt)) {
			return body as Snapshot<PolicyEntry[]>;
		}
	} catch {
		// The bundled snapshot remains available if the platform cache fails.
	}
	return undefined;
}

/** Footer links use a local snapshot; GitHub refreshes never delay page rendering. */
export async function policies(fetcher: typeof fetch, cache?: PolicyCache, waitUntil?: KeepAlive): Promise<PolicyEntry[]> {
	try {
		const { repository, ref } = repositoryConfig();
		const ttl = cacheSeconds();
		const request = cacheRequest(repository, ref);
		return await snapshots({
			key: `${repository}@${ref}`,
			ttlMs: ttl * 1000,
			fallback: fallbackEntries,
			readCache: () => fromCache(cache, request),
			refresh: async () => {
				const sources = await fetchPolicySources(fetcher, repository, ref, env.POLICIES_GITHUB_TOKEN);
				const entries = compilePolicyEntries(sources);
				if (entries.length === 0) throw new Error(`${repository}@${ref} contains no usable policies`);
				return entries;
			},
			writeCache: async (snapshot) => {
				if (!cache) return;
				// Keep a stale copy across isolate restarts while refreshing on the shorter TTL.
				const response = Response.json(snapshot, {
					headers: { 'cache-control': `public, max-age=${Math.max(ttl, 86400)}` }
				});
				await cache.put(request, response as unknown as Parameters<PolicyCache['put']>[1]);
			},
			waitUntil,
			onError: (error) => console.error('[policies]', error)
		});
	} catch (error) {
		console.error('[policies]', error);
		return fallbackEntries;
	}
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
