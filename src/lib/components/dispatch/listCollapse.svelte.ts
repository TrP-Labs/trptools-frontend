import { VEHICLE_BUCKET_ORDER, type VehicleBucket } from '$lib/api/types';

/**
 * Which of the board's lists are folded away.
 *
 * Remembered per board in `localStorage`, because which lists a dispatcher
 * cares about is a property of the group they are working rather than of the
 * browser they are sitting at. The personal board at `/tools/dispatch` has a
 * key of its own for the same reason.
 */
export class ListCollapse {
	closed = $state<Record<VehicleBucket, boolean>>({
		SERVICE: false,
		STAFF: false,
		NORMAL: false,
		DECORATIVE: false
	});

	#key = '';

	/** Call from an effect, so it runs in the browser and follows the board. */
	load(board: string) {
		this.#key = `trptools:dispatch:collapsed:${board}`;

		const stored = localStorage.getItem(this.#key);
		if (!stored) return;

		try {
			const parsed = JSON.parse(stored) as Partial<Record<VehicleBucket, boolean>>;
			for (const bucket of VEHICLE_BUCKET_ORDER) {
				const value = parsed[bucket];
				if (typeof value === 'boolean') this.closed[bucket] = value;
			}
		} catch {
			// A corrupt entry is not worth a message; the defaults are fine.
		}
	}

	toggle(bucket: VehicleBucket) {
		this.closed[bucket] = !this.closed[bucket];
		this.#save();
	}

	open(bucket: VehicleBucket) {
		if (!this.closed[bucket]) return;
		this.closed[bucket] = false;
		this.#save();
	}

	#save() {
		if (this.#key) localStorage.setItem(this.#key, JSON.stringify(this.closed));
	}
}
