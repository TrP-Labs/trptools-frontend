/**
 * Hierarchical keyboard navigation for the dispatch table.
 *
 * Tabbing through a dispatch room means four stops on every vehicle, which is
 * unusable with sixty of them. This is the treegrid pattern instead: the
 * cursor moves between *vehicles* first, and only drills into a vehicle's
 * controls once you ask it to. Going back up is Escape or Left — the two
 * conventions people already reach for — and Escape at the top level leaves
 * the mode entirely, so there is always a way out with the key you just used.
 *
 * The cursor moves real DOM focus onto the control it lands on rather than
 * imitating one. Enter, Space and a select's own arrow-key behaviour then work
 * exactly as the browser intends, which is also why Up and Down are left alone
 * once you are inside a row.
 */

export const ROW_CELLS = ['route', 'assigned', 'towing', 'delete'] as const;
export type NavCell = (typeof ROW_CELLS)[number];

export class DispatchNav {
	enabled = $state(false);
	/** Index into the flattened vehicle list. */
	row = $state(0);
	/** The control the cursor is on, or null while it sits on the row itself. */
	cell = $state<NavCell | null>(null);

	toggle(count: number) {
		this.enabled = !this.enabled;
		this.cell = null;
		if (this.enabled) this.row = Math.min(this.row, Math.max(count - 1, 0));
	}

	exit() {
		this.enabled = false;
		this.cell = null;
	}

	/** True when the key was navigation and the page should not act on it. */
	handle(event: KeyboardEvent, count: number): boolean {
		if (!this.enabled || count === 0) return false;

		switch (event.key) {
			case 'Escape':
				// Up one level, then out. Never both at once.
				if (this.cell !== null) this.cell = null;
				else this.exit();
				return true;

			case 'Backspace':
				if (this.cell === null) return false;
				this.cell = null;
				return true;

			case 'ArrowDown':
				if (this.cell !== null) return false;
				this.row = Math.min(this.row + 1, count - 1);
				return true;

			case 'ArrowUp':
				if (this.cell !== null) return false;
				this.row = Math.max(this.row - 1, 0);
				return true;

			case 'ArrowRight': {
				const index = this.cell === null ? -1 : ROW_CELLS.indexOf(this.cell);
				this.cell = ROW_CELLS[Math.min(index + 1, ROW_CELLS.length - 1)]!;
				return true;
			}

			case 'ArrowLeft': {
				if (this.cell === null) return true;
				const index = ROW_CELLS.indexOf(this.cell);
				this.cell = index <= 0 ? null : ROW_CELLS[index - 1]!;
				return true;
			}

			case 'Home':
				if (this.cell !== null) return false;
				this.row = 0;
				return true;

			case 'End':
				if (this.cell !== null) return false;
				this.row = count - 1;
				return true;

			case 'Enter':
				// Entering a row is ours; activating a control is the browser's.
				if (this.cell !== null) return false;
				this.cell = ROW_CELLS[0]!;
				return true;

			default:
				return false;
		}
	}
}
