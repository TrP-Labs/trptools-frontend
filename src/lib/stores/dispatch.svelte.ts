import { dispatchStreamUrl } from '$lib/api/client';
import type { DispatchStreamEvent, DispatchVehicle } from '$lib/api/types';

export type ConnectionStatus = 'idle' | 'connecting' | 'live' | 'retrying' | 'closed';

/**
 * Live dispatch room state.
 *
 * The stream opens with a SYNC frame carrying the whole vehicle list, so a
 * reconnect is self-healing: there is no need to diff or replay anything, the
 * next SYNC simply replaces local state.
 */
export class DispatchRoom {
	vehicles = $state<DispatchVehicle[]>([]);
	presence = $state<string[]>([]);
	status = $state<ConnectionStatus>('idle');
	lastEventAt = $state<number | null>(null);

	#source: EventSource | null = null;
	#retry = 0;
	#retryTimer: ReturnType<typeof setTimeout> | null = null;
	#roomId: string | null = null;

	connect(roomId: string) {
		if (this.#roomId === roomId && this.#source) return;

		this.disconnect();
		this.#roomId = roomId;
		this.#open();
	}

	#open() {
		if (!this.#roomId) return;

		this.status = this.#retry === 0 ? 'connecting' : 'retrying';

		const source = new EventSource(dispatchStreamUrl(this.#roomId), { withCredentials: true });
		this.#source = source;

		source.onopen = () => {
			this.#retry = 0;
			this.status = 'live';
		};

		source.onmessage = (message) => {
			this.lastEventAt = Date.now();

			let event: DispatchStreamEvent;
			try {
				event = JSON.parse(message.data) as DispatchStreamEvent;
			} catch {
				return;
			}

			this.#apply(event);
		};

		source.onerror = () => {
			// EventSource retries on its own, but with no backoff and no way to
			// stop after the room closes, so reconnection is handled here.
			source.close();
			this.#source = null;

			if (this.status === 'closed') return;

			this.status = 'retrying';
			this.#retry += 1;

			const delay = Math.min(1000 * 2 ** (this.#retry - 1), 15_000);
			this.#retryTimer = setTimeout(() => this.#open(), delay);
		};
	}

	#apply(event: DispatchStreamEvent) {
		switch (event.event) {
			case 'SYNC':
				this.vehicles = event.data;
				break;

			case 'ADD':
				this.vehicles = this.vehicles.some((vehicle) => vehicle.id === event.data.id)
					? this.vehicles
					: [...this.vehicles, event.data];
				break;

			case 'UPDATE':
				this.vehicles = this.vehicles.map((vehicle) =>
					vehicle.id === event.data.id ? { ...vehicle, ...event.data } : vehicle
				);
				break;

			case 'DELETE':
				this.vehicles = this.vehicles.filter((vehicle) => vehicle.id !== event.data);
				break;

			case 'PRESENCE':
				this.presence = event.data;
				break;

			case 'CLOSED':
				this.status = 'closed';
				this.disconnect();
				break;

			case 'HEARTBEAT':
				break;
		}
	}

	/** Applies a change locally so the UI responds before the echo arrives. */
	patchLocal(id: string, patch: Partial<DispatchVehicle>) {
		this.vehicles = this.vehicles.map((vehicle) =>
			vehicle.id === id ? { ...vehicle, ...patch } : vehicle
		);
	}

	removeLocal(id: string) {
		this.vehicles = this.vehicles.filter((vehicle) => vehicle.id !== id);
	}

	disconnect() {
		if (this.#retryTimer) {
			clearTimeout(this.#retryTimer);
			this.#retryTimer = null;
		}

		this.#source?.close();
		this.#source = null;
		this.#roomId = null;
	}
}
