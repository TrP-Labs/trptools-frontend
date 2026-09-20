import type { PolicySource } from './policyDocuments';

const MAX_FILES = 32;
const MAX_FILE_BYTES = 128 * 1024;

type GitHubFile = {
	name?: unknown;
	type?: unknown;
	size?: unknown;
	download_url?: unknown;
};

async function responseText(response: Response, name: string) {
	if (!response.ok) throw new Error(`Could not fetch ${name}: ${response.status}`);
	const declared = Number(response.headers.get('content-length'));
	if (Number.isFinite(declared) && declared > MAX_FILE_BYTES) {
		throw new Error(`${name} is larger than ${MAX_FILE_BYTES} bytes`);
	}
	const contents = await response.text();
	if (new TextEncoder().encode(contents).byteLength > MAX_FILE_BYTES) {
		throw new Error(`${name} is larger than ${MAX_FILE_BYTES} bytes`);
	}
	return contents;
}

/** Read the repository root and fetch every supported policy document in it. */
export async function fetchPolicySources(
	fetcher: typeof fetch,
	repository: string,
	ref: string,
	token?: string
): Promise<PolicySource[]> {
	const [owner, name] = repository.split('/');
	const headers = new Headers({
		accept: 'application/vnd.github+json',
		'x-github-api-version': '2022-11-28'
	});
	if (token) headers.set('authorization', `Bearer ${token}`);

	const listing = await fetcher(
		`https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}/contents/?ref=${encodeURIComponent(ref)}`,
		{ headers }
	);
	if (!listing.ok) throw new Error(`Could not list ${repository}@${ref}: ${listing.status}`);

	const body: unknown = await listing.json();
	if (!Array.isArray(body)) throw new Error(`${repository}@${ref} did not return a directory`);

	const files = (body as GitHubFile[])
		.filter(
			(file) =>
				file.type === 'file' &&
				typeof file.name === 'string' &&
				/\.(md|txt)$/i.test(file.name) &&
				typeof file.download_url === 'string' &&
				file.download_url.startsWith('https://raw.githubusercontent.com/') &&
				typeof file.size === 'number' &&
				file.size <= MAX_FILE_BYTES
		)
		.slice(0, MAX_FILES) as Array<GitHubFile & { name: string; download_url: string }>;

	return Promise.all(
		files.map(async (file) => ({
			name: file.name,
			contents: await responseText(await fetcher(file.download_url), file.name)
		}))
	);
}
