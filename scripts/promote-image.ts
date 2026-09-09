import assert from 'node:assert/strict';

type Run = { id: number; head_sha: string; head_branch: string; event: string; status: string; conclusion: string | null };
type Command = (args: string[]) => Promise<string>;

export async function promoteImage(options: {
	sha: string; image: string; tags: string[];
	runs: () => Promise<Run[]>; command: Command;
	sleep: () => Promise<unknown>; attempts?: number;
}) {
	const { sha, image, tags, runs, command, sleep, attempts = 40 } = options;
	assert.match(sha, /^[a-f0-9]{40}$/);
	assert(tags.length > 0, 'No release tags were generated');
	assert(tags.every((tag) => tag.startsWith(`${image}:`) && !tag.endsWith(':latest')));
	let published = false;
	for (let attempt = 0; attempt < attempts; attempt++) {
		const run = (await runs())
			.filter((run) => run.head_sha === sha && run.head_branch === 'main' && run.event === 'push')
			.sort((a, b) => b.id - a.id)[0];
		if (run?.status === 'completed') {
			assert.equal(run.conclusion, 'success', `Main publication ${run.id} did not succeed`);
			published = true;
			break;
		}
		if (attempt + 1 < attempts) await sleep();
	}
	assert(published, 'No successful main publication for this commit within 20 minutes. Publish main first, then rerun this tag workflow.');
	const manifest = JSON.parse(await command([
		'docker', 'buildx', 'imagetools', 'inspect', `${image}:sha-${sha}`, '--format', '{{json .Manifest}}'
	]));
	assert.match(manifest.digest, /^sha256:[a-f0-9]{64}$/);
	for (const architecture of ['amd64', 'arm64']) {
		assert(manifest.manifests?.some((entry: { platform?: { os: string; architecture: string } }) =>
			entry.platform?.os === 'linux' && entry.platform.architecture === architecture),
		`Published image is missing linux/${architecture}`);
	}
	// Resolve the mutable SHA tag once. Copying this exact index retains both
	// architectures and attestations even if a main workflow is rerun meanwhile.
	await command(['docker', 'buildx', 'imagetools', 'create',
		...tags.flatMap((tag) => ['--tag', tag]), `${image}@${manifest.digest}`]);
	return manifest.digest as string;
}

if (import.meta.main) {
	const command: Command = async (args) => {
		const process = Bun.spawn(args, { stdout: 'pipe', stderr: 'inherit' });
		const output = await new Response(process.stdout).text();
		assert.equal(await process.exited, 0, `${args[0]} ${args[1]} failed`);
		return output;
	};
	const sha = (await command(['git', 'rev-parse', 'HEAD'])).trim();
	const repository = process.env.GITHUB_REPOSITORY;
	assert(repository, 'GITHUB_REPOSITORY is required');
	const digest = await promoteImage({
		sha, image: 'ghcr.io/trp-labs/trptools-frontend',
		tags: (process.env.IMAGE_TAGS ?? '').split('\n').map((tag) => tag.trim()).filter(Boolean),
		runs: async () => JSON.parse(await command(['gh', 'api',
			`repos/${repository}/actions/workflows/publish.yml/runs?event=push&branch=main&head_sha=${sha}&per_page=100`
		])).workflow_runs,
		command, sleep: () => Bun.sleep(30_000)
	});
	console.log(`Promoted ${sha} from ${digest}`);
}
