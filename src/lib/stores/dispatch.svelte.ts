import { dispatchStreamUrl } from '$lib/api/client';
import type { DispatchStreamEvent, DispatchVehicle, GameStatus, HostSnapshot } from '$lib/api/types';

/** Matches the API's window: longer than the game's slowest retry interval. */
const GAME_LIVE_MS = 75_000;

export type ConnectionStatus = 'idle' | 'connecting' | 'live' | 'retrying' | 'closed';

/**
 * Live dispatch room state.
 *
 * The stream opens with a SYNC frame carrying the whole vehicle list, so a
 * reconnect is self-healing: there is no need to diff or replay anything, the
 * next SYNC simply replaces local state.
 */
export class DispatchRoom {
	host = $state<HostSnapshot | null>(null);
	vehicles = $state<DispatchVehicle[]>([]);
	presence = $state<string[]>([]);
	status = $state<ConnectionStatus>('idle');
	lastEventAt = $state<number | null>(null);
	/** The hosted server feeding this room, if one has reported. */
	game = $state<GameStatus | null>(null);
	/** When `game` arrived, by this browser's clock, so skew cannot keep it live. */
	gameReceivedAt = $state(0);
	#now = $state(Date.now());
	#clock: ReturnType<typeof setInterval> | null = null;

	/**
	 * Whether a server is feeding the room right now.
	 *
	 * Re-checked against a ticking clock, because the moment a feed stops is
	 * exactly the moment nothing arrives to say so — and the import button has
	 * to come back by itself.
	 */
	get live(): boolean {
		return Boolean(this.game?.live) && this.#now - this.gameReceivedAt < GAME_LIVE_MS;
	}

	#source: EventSource | null = null;
	#retry = 0;
	#retryTimer: ReturnType<typeof setTimeout> | null = null;
	#roomId: string | null = null;

	connect(roomId: string) {
		if (this.#roomId === roomId && this.#source) return;

		this.disconnect();
		this.host = null;
		this.vehicles = [];
		this.presence = [];
		this.game = null;
		this.#roomId = roomId;
		this.#clock ??= setInterval(() => (this.#now = Date.now()), 5000);
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

			case 'HOST':
				this.applyHost(event.data);
				break;

			case 'GAME':
				this.game = event.data;
				this.gameReceivedAt = Date.now();
				this.#now = this.gameReceivedAt;
				break;

			case 'HEARTBEAT':
				break;
		}
	}

	applyHost(snapshot: HostSnapshot) {
		if (this.#roomId && snapshot.roomId !== this.#roomId) return;
		// HTTP replies and pub/sub frames can cross in flight between hosts.
		// A later delivery must never roll the room back to an older revision.
		if (!this.host || this.host.roomId !== snapshot.roomId ||
			(snapshot.revision ?? 0) >= (this.host.revision ?? 0)) {
			this.host = snapshot;
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

		if (this.#clock) {
			clearInterval(this.#clock);
			this.#clock = null;
		}

		this.#source?.close();
		this.#source = null;
		this.#roomId = null;
	}
}
