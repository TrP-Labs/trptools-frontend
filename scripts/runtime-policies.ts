import { chmod, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

export async function writeRuntimePolicies(directory: string) {
	// mkdtemp creates 0700 directories. On Linux the CI runner and container
	// have different UIDs, so the non-root app cannot traverse that mount.
	// These are public test documents; keep them readable across that boundary.
	await chmod(directory, 0o755);
	for (const [name, contents] of [
		['Runtime Policy.md', '# Runtime Policy\n\n## Storage\n\n**Runtime-only document.**'],
		['About.txt', '/about'],
		['Unsafe.txt', 'javascript:alert(1)']
	]) {
		const path = join(directory, name);
		await writeFile(path, contents);
		// Explicit chmod also handles restrictive umasks and existing files.
		await chmod(path, 0o644);
	}
}
