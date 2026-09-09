import { expect, test } from 'bun:test';
import { dockerDependencies } from './docker-dependencies';

const manifest = await Bun.file(new URL('../package.json', import.meta.url)).text();
const lock = await Bun.file(new URL('../bun.lock', import.meta.url)).text();

test('Docker retains every registry package version and integrity from the committed lock', () => {
	const original = Bun.JSONC.parse(lock);
	const output = dockerDependencies(manifest, lock);
	const result = JSON.parse(output.lock);
	const expectedPackages = { ...original.packages };
	delete expectedPackages['trptools-backend'];
	expect(result.packages).toEqual(expectedPackages);
	expect(result.lockfileVersion).toBe(original.lockfileVersion);
	expect(result.configVersion).toBe(original.configVersion);
	const expectedManifest = JSON.parse(manifest);
	delete expectedManifest.devDependencies['trptools-backend'];
	expect(JSON.parse(output.manifest)).toEqual(expectedManifest);
	expect(result.workspaces[''].devDependencies).toEqual(expectedManifest.devDependencies);
});

test('a missing or changed sibling declaration fails rather than silently changing the graph', () => {
	const changed = JSON.parse(manifest);
	changed.devDependencies['trptools-backend'] = 'file:../another-backend';
	expect(() => dockerDependencies(JSON.stringify(changed), lock)).toThrow();
	expect(() => dockerDependencies(manifest, '{}')).toThrow();
});

test('an external runtime dependency cannot accidentally produce a broken image', () => {
	const changed = { ...JSON.parse(manifest), dependencies: { external: '1.0.0' } };
	expect(() => dockerDependencies(JSON.stringify(changed), lock)).toThrow('explicitly packaged');
});

test('Docker and CI agree on the pinned Bun version', async () => {
	const version = (await Bun.file(new URL('../.bun-version', import.meta.url)).text()).trim();
	const dockerfile = await Bun.file(new URL('../Dockerfile', import.meta.url)).text();
	expect(dockerfile).toContain(`ARG BUN_VERSION=${version}`);
});
