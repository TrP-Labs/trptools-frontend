import assert from 'node:assert/strict';

type Manifest = {
	dependencies?: Record<string, string>;
	devDependencies?: Record<string, string>;
	[key: string]: unknown;
};
type Lock = {
	workspaces: Record<string, Manifest>;
	packages: Record<string, unknown>;
	[key: string]: unknown;
};

/** Remove only the sibling type source, without resolving/upgrading packages. */
export function dockerDependencies(manifestText: string, lockText: string) {
	const manifest: Manifest = JSON.parse(manifestText);
	const lock: Lock = Bun.JSONC.parse(lockText);
	assert.equal(Object.keys(manifest.dependencies ?? {}).length, 0,
		'Runtime dependencies must be bundled or explicitly packaged in Dockerfile');
	assert.equal(manifest.devDependencies?.['trptools-backend'], 'file:../trptools-backend');
	assert.equal(lock.workspaces['']?.devDependencies?.['trptools-backend'], 'file:../trptools-backend');
	delete manifest.devDependencies!['trptools-backend'];
	delete lock.workspaces[''].devDependencies!['trptools-backend'];
	delete lock.packages['trptools-backend'];
	return {
		manifest: JSON.stringify(manifest, null, 2) + '\n',
		lock: JSON.stringify(lock, null, 2) + '\n'
	};
}

if (import.meta.main) {
	const output = dockerDependencies(await Bun.file('package.json').text(), await Bun.file('bun.lock').text());
	await Bun.write('package.json', output.manifest);
	await Bun.write('bun.lock', output.lock);
}
