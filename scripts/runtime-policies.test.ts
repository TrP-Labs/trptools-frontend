import { expect, test } from 'bun:test';
import { chmod, mkdtemp, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { writeRuntimePolicies } from './runtime-policies';

test('policy fixtures can be read by a container UID different from the runner', async () => {
	const directory = await mkdtemp(join(tmpdir(), 'trptools-policy-permissions-'));
	try {
		await chmod(directory, 0o700);
		const document = join(directory, 'Runtime Policy.md');
		await writeFile(document, 'old fixture', { mode: 0o600 });
		await writeRuntimePolicies(directory);
		expect((await stat(directory)).mode & 0o777).toBe(0o755);
		const files = await readdir(directory);
		expect(files.length).toBe(3);
		for (const file of files) expect((await stat(join(directory, file))).mode & 0o777).toBe(0o644);
		expect(await Bun.file(document).text()).toContain('Runtime-only document.');
	} finally {
		await rm(directory, { recursive: true, force: true });
	}
});
