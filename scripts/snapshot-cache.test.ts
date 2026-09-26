import { describe, expect, test } from 'bun:test';
import { createSnapshotCache, type Snapshot } from '../src/lib/server/snapshotCache';

function deferred<T>() {
	let resolve!: (value: T) => void;
	let reject!: (error: Error) => void;
	const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
	return { promise, resolve, reject };
}

function fixture(cached?: Snapshot<string>) {
	const refresh = deferred<string>();
	const tasks: Promise<unknown>[] = [];
	let calls = 0;
	let clock = 1000;
	const options = {
		key: 'policies@main', ttlMs: 300_000, fallback: 'bundled',
		readCache: async () => cached,
		refresh: () => { calls++; return refresh.promise; },
		writeCache: async (_snapshot: Snapshot<string>) => {},
		waitUntil: (task: Promise<unknown>) => tasks.push(task),
		onError: (_error: unknown) => {}, now: () => clock
	};
	return { options, refresh, tasks, calls: () => calls, advance: () => { clock += 31_000; } };
}

describe('policy snapshots', () => {
	test('cold pages return bundled content without waiting for GitHub', async () => {
		const cache = createSnapshotCache<string>();
		const f = fixture();
		expect(await cache(f.options)).toBe('bundled');
		expect(f.tasks).toHaveLength(1);
		f.refresh.resolve('current');
		await f.tasks[0];
		expect(await cache(f.options)).toBe('current');
		expect(f.calls()).toBe(1);
	});

	test('stale content stays available and concurrent requests share one refresh', async () => {
		const cache = createSnapshotCache<string>();
		const f = fixture({ value: 'last good', expiresAt: 0 });
		expect(await cache(f.options)).toBe('last good');
		expect(await cache(f.options)).toBe('last good');
		expect(f.calls()).toBe(1);
		f.refresh.resolve('updated');
		await f.tasks[0];
		expect(await cache(f.options)).toBe('updated');
	});

	test('a failed refresh keeps the snapshot and throttles retries', async () => {
		const cache = createSnapshotCache<string>();
		const f = fixture({ value: 'last good', expiresAt: 0 });
		await cache(f.options);
		f.refresh.reject(new Error('GitHub unavailable'));
		await f.tasks[0];
		expect(await cache(f.options)).toBe('last good');
		expect(f.calls()).toBe(1);
		f.advance();
		await cache({ ...f.options, refresh: async () => 'recovered' });
		await f.tasks.at(-1);
		expect(await cache(f.options)).toBe('recovered');
	});

	test('a different repository never receives another repository snapshot', async () => {
		const cache = createSnapshotCache<string>();
		const f = fixture();
		await cache(f.options);
		f.refresh.resolve('first repository');
		await f.tasks[0];
		expect(await cache({ ...f.options, key: 'other@main', refresh: async () => 'second repository' })).toBe('bundled');
		await f.tasks.at(-1);
	});
});
