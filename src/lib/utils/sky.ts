/**
 * The sky over TrP at a given in-game minute, as a gradient.
 *
 * Keyframes rather than four fixed themes, so the host's header drifts from
 * night through a golden dawn into blue day and back the way the game's own
 * sky does, instead of snapping at the hour. Each stop is [zenith, horizon];
 * between two stops both ends are blended.
 */
type Stop = { minute: number; top: string; bottom: string };

const STOPS: Stop[] = [
	{ minute: 0, top: '#05071a', bottom: '#151a3d' },
	{ minute: 270, top: '#070a24', bottom: '#1c2150' },
	{ minute: 330, top: '#2a2a6b', bottom: '#c86b5a' },
	{ minute: 390, top: '#4a6fb5', bottom: '#f6b45e' },
	{ minute: 480, top: '#3d7fd6', bottom: '#9fd3f5' },
	{ minute: 960, top: '#2f74cf', bottom: '#a9dbf7' },
	{ minute: 1080, top: '#4b5fa8', bottom: '#f4a85a' },
	{ minute: 1140, top: '#3a2c6e', bottom: '#e0784f' },
	{ minute: 1200, top: '#141640', bottom: '#4a2f6b' },
	{ minute: 1440, top: '#05071a', bottom: '#151a3d' }
];

function channels(hex: string): [number, number, number] {
	const value = Number.parseInt(hex.slice(1), 16);
	return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

function blend(a: string, b: string, t: number): string {
	const [r1, g1, b1] = channels(a);
	const [r2, g2, b2] = channels(b);
	const mix = (x: number, y: number) => Math.round(x + (y - x) * t);
	return `rgb(${mix(r1, r2)} ${mix(g1, g2)} ${mix(b1, b2)})`;
}

export type SkyPhase = 'night' | 'dawn' | 'day' | 'dusk';

export function skyPhase(minute: number): SkyPhase {
	const m = ((minute % 1440) + 1440) % 1440;
	if (m < 300 || m >= 1200) return 'night';
	if (m < 450) return 'dawn';
	if (m < 1050) return 'day';
	return 'dusk';
}

/** The two ends of the sky at `minute`, top first. */
export function skyColors(minute: number): [string, string] {
	const m = ((minute % 1440) + 1440) % 1440;
	const next = STOPS.findIndex((stop) => stop.minute > m);
	const after = STOPS[next === -1 ? STOPS.length - 1 : next]!;
	const before = STOPS[Math.max(0, (next === -1 ? STOPS.length : next) - 1)]!;
	const span = after.minute - before.minute;
	const t = span > 0 ? (m - before.minute) / span : 0;
	return [blend(before.top, after.top, t), blend(before.bottom, after.bottom, t)];
}

/**
 * Where the sun or moon sits on its arc, from 0 (rising) to 1 (setting).
 *
 * The sun is up 06:00–18:00 and the moon the rest, so one of the two is
 * always somewhere on the arc.
 */
export function bodyProgress(minute: number): { sun: boolean; progress: number } {
	const m = ((minute % 1440) + 1440) % 1440;
	if (m >= 360 && m < 1080) return { sun: true, progress: (m - 360) / 720 };
	return { sun: false, progress: ((m - 1080 + 1440) % 1440) / 720 };
}

export function formatGameTime(minute: number): string {
	const m = ((Math.floor(minute) % 1440) + 1440) % 1440;
	return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

/**
 * The game clock between reports.
 *
 * The server says what time it is every fifteen seconds or so; between two
 * reports the clock runs at whatever rate those two imply, so the header
 * moves smoothly rather than in jumps. A rate that makes no sense (the server
 * restarted, an admin set the time) is not extrapolated from.
 */
export class GameClock {
	#minute: number | null = null;
	#at = 0;
	#rate = 0;
	/**
	 * The first report the rate is measured from. Reports carry whole
	 * minutes, so two fifteen seconds apart often read the same; measuring
	 * from further back keeps a slow clock from stuttering between 0 and 4.
	 */
	#anchor: { minute: number; at: number; advanced: number } | null = null;

	observe(minute: number | null, at: number) {
		if (minute === null) {
			this.#minute = null;
			this.#anchor = null;
			return;
		}
		if (this.#minute !== null && this.#anchor && at > this.#at) {
			const step = (((minute - this.#minute) % 1440) + 1440) % 1440;
			this.#anchor.advanced += step;
			const rate = this.#anchor.advanced / ((at - this.#anchor.at) / 60_000);
			if (rate > 120 || step > 720) this.#anchor = null;
			else this.#rate = rate;
		}
		this.#anchor ??= { minute, at, advanced: 0 };
		this.#minute = minute;
		this.#at = at;
	}

	at(now: number): number | null {
		if (this.#minute === null) return null;
		const elapsed = Math.min(Math.max(0, now - this.#at), 90_000) / 60_000;
		return (this.#minute + elapsed * this.#rate) % 1440;
	}
}
