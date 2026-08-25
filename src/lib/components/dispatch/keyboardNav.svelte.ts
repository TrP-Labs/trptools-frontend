/**
 * Hierarchical keyboard navigation for the dispatch table.
 *
 * Tabbing through a dispatch room means several stops on every vehicle, which
 * is unusable with sixty of them. This is the treegrid pattern instead: the
 * cursor moves between *vehicles* first, and only drills into a vehicle's
 * controls once you ask it to. Going back up is Escape or Left — the two
 * conventions people already reach for — and Escape at the top level leaves
 * the mode entirely, so there is always a way out with the key you just used.
 *
 * The cursor moves real DOM focus onto the control it lands on rather than
 * imitating one. Enter, Space and a control's own arrow-key behaviour then
 * work exactly as expected, which is also why Up and Down are left alone once
 * you are inside a row.
 *
 * Rows do not all carry the same controls: a service vehicle has a status, a
 * location and a tow, a piece of scenery has almost nothing, and a vehicle
 * under tow has its controls replaced by the one button that ends the tow. So
 * the cursor is told each row's own cells rather than assuming a fixed set —
 * assuming one is how a cursor ends up on a control that is not there.
 */

import type { VehicleBucket } from '$lib/api/types';

export type NavCell =
	| 'route'
	| 'note'
	| 'solve'
	| 'assigned'
	| 'status'
	| 'location'
	| 'tow'
	| 'endtow'
	| 'delete';

export interface NavRow {
	id: string;
	bucket: VehicleBucket;
	cells: NavCell[];
}

export class DispatchNav {
	enabled = $state(false);
	/** Index into the flattened vehicle list. */
	row = $state(0);
	/** The control the cursor is on, or null while it sits on the row itself. */
	cell = $state<NavCell | null>(null);

	toggle(rows: NavRow[]) {
		this.enabled = !this.enabled;
		this.cell = null;
		if (this.enabled) this.row = Math.min(this.row, Math.max(rows.length - 1, 0));
	}

	exit() {
		this.enabled = false;
		this.cell = null;
	}

	/** Puts the cursor on the first vehicle of a list, turning the mode on. */
	jumpTo(rows: NavRow[], bucket: VehicleBucket): boolean {
		const index = rows.findIndex((row) => row.bucket === bucket);
		if (index < 0) return false;

		this.enabled = true;
		this.cell = null;
		this.row = index;
		return true;
	}

	/** The list the cursor is currently in, if any. */
	bucket(rows: NavRow[]): VehicleBucket | null {
		return rows[this.row]?.bucket ?? null;
	}

	/**
	 * True when the key was navigation and the page should not act on it.
	 *
	 * `typing` is passed because a cell can *be* a text field. Its arrows still
	 * belong to the cursor — they are the only way out of the field — but its
	 * Backspace plainly does not, and taking that one meant deleting a letter
	 * threw you out of the box you were deleting it in.
	 */
	handle(event: KeyboardEvent, rows: NavRow[], typing = false): boolean {
		if (!this.enabled || rows.length === 0) return false;

		const cells = rows[Math.min(this.row, rows.length - 1)]?.cells ?? [];

		switch (event.key) {
			case 'Escape':
				// Up one level, then out. Never both at once.
				if (this.cell !== null) this.cell = null;
				else this.exit();
				return true;

			case 'Backspace':
				if (typing || this.cell === null) return false;
				this.cell = null;
				return true;

			case 'ArrowDown':
				if (this.cell !== null) return false;
				this.row = Math.min(this.row + 1, rows.length - 1);
				return true;

			case 'ArrowUp':
				if (this.cell !== null) return false;
				this.row = Math.max(this.row - 1, 0);
				return true;

			case 'ArrowRight': {
				if (cells.length === 0) return true;
				const index = this.cell === null ? -1 : cells.indexOf(this.cell);
				this.cell = cells[Math.min(index + 1, cells.length - 1)]!;
				return true;
			}

			case 'ArrowLeft': {
				if (this.cell === null) return true;
				const index = cells.indexOf(this.cell);
				this.cell = index <= 0 ? null : cells[index - 1]!;
				return true;
			}

			case 'Home':
				if (this.cell !== null) return false;
				this.row = 0;
				return true;

			case 'End':
				if (this.cell !== null) return false;
				this.row = rows.length - 1;
				return true;

			case 'Enter':
				// Entering a row is ours; activating a control is the browser's.
				if (this.cell !== null) return false;
				if (cells.length === 0) return true;
				this.cell = cells[0]!;
				return true;

			default:
				return false;
		}
	}

	/**
	 * Keeps the cursor on something that exists.
	 *
	 * Vehicles come and go mid-shift, and a row's controls change underneath
	 * the cursor too — confirming a tow replaces a vehicle's whole set. Both
	 * would otherwise leave the cursor pointing at nothing, which reads as the
	 * keyboard having stopped working.
	 */
	clamp(rows: NavRow[]) {
		if (rows.length === 0) {
			this.row = 0;
			this.cell = null;
			return;
		}

		if (this.row > rows.length - 1) this.row = rows.length - 1;

		const cells = rows[this.row]?.cells ?? [];
		if (this.cell !== null && !cells.includes(this.cell)) this.cell = cells[0] ?? null;
	}
}
