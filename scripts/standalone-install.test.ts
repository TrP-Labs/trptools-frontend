import { expect, test } from 'bun:test';

const manifest = await Bun.file(new URL('../package.json', import.meta.url)).json();
const lock = Bun.JSONC.parse(await Bun.file(new URL('../bun.lock', import.meta.url)).text());

test('a standalone Git checkout has no local package dependencies', () => {
	for (const dependencies of [manifest.dependencies ?? {}, manifest.devDependencies ?? {}]) {
		for (const version of Object.values(dependencies)) {
			expect(String(version).startsWith('file:')).toBeFalse();
		}
	}

	expect(JSON.stringify(lock)).not.toContain('trptools-backend');
});

test('Docker and CI agree on the pinned Bun version', async () => {
	const version = (await Bun.file(new URL('../.bun-version', import.meta.url)).text()).trim();
	const dockerfile = await Bun.file(new URL('../Dockerfile', import.meta.url)).text();
	expect(dockerfile).toContain(`ARG BUN_VERSION=${version}`);
});
