import { expect, test } from 'bun:test';
import { promoteImage } from './promote-image';

const sha = 'a'.repeat(40);
const digest = `sha256:${'b'.repeat(64)}`;
const image = 'ghcr.io/trp-labs/trptools-frontend';
const successful = { id: 1, head_sha: sha, head_branch: 'main', event: 'push', status: 'completed', conclusion: 'success' };

function fixture() {
	const calls: string[][] = [];
	const manifest = { digest, manifests: ['amd64', 'arm64'].map((architecture) => ({ platform: { os: 'linux', architecture } })) };
	const options = {
		sha, image, tags: [`${image}:2.8.2`, `${image}:2.8`, `${image}:2`], attempts: 3,
		runs: async () => [successful], sleep: async () => {},
		command: async (args: string[]) => { calls.push(args); return JSON.stringify(manifest); }
	};
	return { calls, manifest, options };
}

test('release copies the exact multi-platform digest and preserves every requested alias', async () => {
	const { calls, options } = fixture();
	expect(await promoteImage(options)).toBe(digest);
	expect(calls[0]).toContain(`${image}:sha-${sha}`);
	expect(calls[1]).toEqual(['docker', 'buildx', 'imagetools', 'create',
		...options.tags.flatMap((tag) => ['--tag', tag]), `${image}@${digest}`]);
});

test('a tag arriving first waits for the matching main workflow to finish', async () => {
	const { options } = fixture();
	let count = 0;
	options.runs = async () => ++count === 1 ? [] : count === 2
		? [{ ...successful, status: 'in_progress' }] : [successful];
	expect(await promoteImage(options)).toBe(digest);
	expect(count).toBe(3);
});

for (const conclusion of ['failure', 'cancelled', 'timed_out']) {
	test(`a ${conclusion} main publication never writes release tags`, async () => {
		const { calls, options } = fixture();
		options.runs = async () => [{ ...successful, conclusion }];
		await expect(promoteImage(options)).rejects.toThrow('did not succeed');
		expect(calls).toEqual([]);
	});
}

test('other commits, PRs, and tag runs cannot satisfy the main publication gate', async () => {
	const { calls, options } = fixture();
	options.runs = async () => [{ ...successful, head_sha: 'c'.repeat(40) },
		{ ...successful, event: 'pull_request' }, { ...successful, head_branch: 'v2.8.2' }];
	await expect(promoteImage(options)).rejects.toThrow('Publish main first');
	expect(calls).toEqual([]);
});

test('a newer pending main run wins over an older success', async () => {
	const { calls, options } = fixture();
	options.runs = async () => [successful, { ...successful, id: 2, status: 'in_progress' }];
	await expect(promoteImage(options)).rejects.toThrow('Publish main first');
	expect(calls).toEqual([]);
});

test('missing architecture or malformed digest fails before mutation', async () => {
	for (const broken of ['architecture', 'digest']) {
		const { calls, manifest, options } = fixture();
		if (broken === 'architecture') manifest.manifests.pop();
		else manifest.digest = 'invalid';
		await expect(promoteImage(options)).rejects.toThrow();
		expect(calls.length).toBe(1);
	}
});

test('registry inspection failure never falls back to latest or rebuilds', async () => {
	const { options } = fixture();
	options.command = async () => { throw new Error('Registry unavailable'); };
	await expect(promoteImage(options)).rejects.toThrow('Registry unavailable');
});

test('invalid release inputs cannot publish', async () => {
	for (const tags of [[], [`${image}:latest`], ['another/image:2']]) {
		const { calls, options } = fixture();
		await expect(promoteImage({ ...options, tags })).rejects.toThrow();
		expect(calls).toEqual([]);
	}
});
