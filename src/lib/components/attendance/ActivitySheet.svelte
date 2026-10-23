<script lang="ts">
	/**
	 * One sheet of the activity list: people down the side, shifts across.
	 *
	 * The name column sticks while the shifts scroll under it, so it paints
	 * an opaque background — the rank's own colour, which is what makes a
	 * long sheet scannable by rank at a glance. The scroll is the table's,
	 * never the page's (trap 19).
	 *
	 * There is one tooltip per sheet rather than one per cell: a quarter is
	 * ninety columns by a few hundred rows, and a popover in every cell would
	 * be thousands of hidden elements for the one that is ever open (trap 11).
	 */
	import { IconPlayerPause, IconPlayerPlay } from '@tabler/icons-svelte';
	import Avatar from '$lib/components/users/Avatar.svelte';
	import { readableText } from '$lib/utils/color';
	import { formatNumber, formatShortDate, formatTime } from '$lib/utils/format';
	import type { AttendanceShift, AttendanceStanding } from '$lib/api/types';
	import { m } from '$lib/paraglide/messages.js';

	type Cell = AttendanceStanding['cells'][number];

	interface Props {
		title: string;
		/** Drawn lifted above the sheet under it. */
		raised?: boolean;
		people: AttendanceStanding[];
		shifts: AttendanceShift[];
		canPause: boolean;
		/** Whose pause is being saved; their button waits. */
		pending: Set<string>;
		onpause: (person: AttendanceStanding) => void;
	}

	let { title, raised = false, people, shifts, canPause, pending, onpause }: Props = $props();

	let tip = $state<{ shift: AttendanceShift; cell: Cell; x: number; y: number; below: boolean } | null>(null);

	function show(event: Event, shift: AttendanceShift, cell: Cell) {
		const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
		// Below the cell when there is no room above it, clamped to the screen.
		const below = rect.top < 150;
		const x = Math.min(Math.max(rect.left + rect.width / 2, 130), window.innerWidth - 130);
		tip = { shift, cell, x, y: below ? rect.bottom + 8 : rect.top - 8, below };
	}

	function reason(cell: Cell) {
		switch (cell.reason) {
			case 'SIGNED_UP':
				return m.attendance_reason_signed_up();
			case 'TAKEN_AT_WORD':
				return m.attendance_reason_taken_at_word();
			case 'PRESENT':
				return m.attendance_reason_present();
			case 'NO_SHOW':
				return m.attendance_reason_no_show();
			case 'SHORT':
				return m.attendance_reason_short();
			default:
				return m.attendance_reason_absent();
		}
	}

	function tone(points: number) {
		return points > 0 ? 'text-success' : points < 0 ? 'text-danger' : 'text-text-subtle';
	}

	let cellsFor = $derived(
		new Map(people.map((person) => [person.robloxId, new Map(person.cells.map((cell) => [cell.shiftId, cell]))]))
	);
</script>

<section
	class="card min-w-0 overflow-hidden {raised ? 'relative z-10 shadow-xl ring-1 ring-accent/30' : ''}"
	data-testid="sheet"
>
	<header class="flex items-center gap-2 border-b border-border-base px-4 py-3">
		<h2 class="font-semibold text-text">{title}</h2>
		<span class="rounded-full bg-background-muted px-2 py-0.5 text-xs font-semibold text-text-muted tabular-nums">
			{people.length}
		</span>
	</header>

	<div class="overflow-x-auto" onscroll={() => (tip = null)}>
		<table class="w-max min-w-full border-separate border-spacing-0 text-sm">
			<thead>
				<tr class="text-xs text-text-muted">
					<th
						scope="col"
						class="sticky left-0 z-10 w-40 min-w-40 border-b border-border-base bg-surface px-3 py-2 text-left font-medium sm:w-56 sm:min-w-56"
					>
						{m.attendance_sheet_person()}
					</th>
					<th scope="col" class="border-b border-border-base px-3 py-2 text-right font-medium">
						{m.attendance_sheet_total()}
					</th>
					{#each shifts as shift (shift.id)}
						<th
							scope="col"
							class="min-w-16 border-b border-border-base px-2 py-2 text-center font-medium"
							style="box-shadow: inset 0 3px 0 {shift.color}"
							title={shift.name}
						>
							<span class="block whitespace-nowrap text-text">{formatShortDate(shift.start)}</span>
							<span class="block whitespace-nowrap">{formatTime(shift.start)}</span>
						</th>
					{/each}
				</tr>
			</thead>
			<tbody>
				{#each people as person (person.robloxId)}
					{@const cells = cellsFor.get(person.robloxId)}
					<tr data-paused={person.paused} data-testid="sheet-row" class="group">
						<th
							scope="row"
							class="sticky left-0 z-10 border-b border-border-base p-0 text-left font-normal"
							style={person.paused
								? 'background: var(--color-background-muted); color: var(--color-text-subtle)'
								: `background: ${person.rankColor}; color: ${readableText(person.rankColor)}`}
						>
							<div class="flex w-40 items-center gap-2 px-2 py-1.5 sm:w-56">
								{#if canPause}
									<button
										type="button"
										class="grid size-7 shrink-0 place-items-center rounded-md transition-colors hover:bg-black/15 disabled:cursor-wait disabled:opacity-50"
										aria-label={person.paused
											? m.attendance_unpause({ name: person.name })
											: m.attendance_pause({ name: person.name })}
										title={person.paused ? m.attendance_unpause_hint() : m.attendance_pause_hint()}
										aria-pressed={person.paused}
										disabled={pending.has(person.robloxId)}
										onclick={() => onpause(person)}
									>
										{#if person.paused}<IconPlayerPlay size={15} />{:else}<IconPlayerPause size={15} />{/if}
									</button>
								{:else if person.paused}
									<span class="grid size-7 shrink-0 place-items-center" title={m.attendance_paused()}>
										<IconPlayerPause size={15} />
									</span>
								{/if}
								<Avatar
									src={person.avatar}
									name={person.name}
									size={24}
									class="hidden shrink-0 sm:block {person.paused ? 'grayscale' : ''}"
								/>
								<div class="min-w-0 leading-tight">
									<a
										href="https://www.roblox.com/users/{person.robloxId}/profile"
										class="block truncate font-medium hover:underline">{person.name}</a
									>
									<span class="block truncate text-xs opacity-80">
										{person.paused ? m.attendance_paused() : person.rankName}
									</span>
								</div>
							</div>
						</th>
						<td
							class="border-b border-border-base px-3 py-1.5 text-right font-mono font-semibold tabular-nums
								{person.paused ? 'bg-background-muted text-text-subtle' : tone(person.points)}"
						>
							{formatNumber(person.points)}
						</td>
						{#each shifts as shift (shift.id)}
							{@const cell = cells?.get(shift.id)}
							<td
								class="border-b border-border-base p-0 text-center {person.paused ? 'bg-background-muted' : ''}"
							>
								{#if cell}
									<button
										type="button"
										class="h-full w-full px-2 py-2 font-mono tabular-nums transition-colors hover:bg-background-muted focus-visible:bg-background-muted
											{person.paused ? 'text-text-subtle' : tone(cell.points)}
											{cell.reason === 'NO_SHOW' ? 'underline decoration-dotted' : ''}"
										aria-label={`${shift.name}, ${formatShortDate(shift.start)}: ${formatNumber(cell.points)}`}
										onpointerenter={(event) => show(event, shift, cell)}
										onpointerleave={() => (tip = null)}
										onfocus={(event) => show(event, shift, cell)}
										onblur={() => (tip = null)}
									>
										{cell.points > 0 ? '+' : ''}{formatNumber(cell.points)}
									</button>
								{:else}
									<span class="text-text-subtle/50" aria-hidden="true">·</span>
								{/if}
							</td>
						{/each}
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
</section>

{#if tip}
	<div
		role="tooltip"
		class="pointer-events-none fixed z-50 w-60 -translate-x-1/2 rounded-lg border border-border-base bg-background-secondary p-3 text-xs shadow-lg
			{tip.below ? '' : '-translate-y-full'}"
		style="left: {tip.x}px; top: {tip.y}px"
		data-testid="cell-tooltip"
	>
		<p class="flex items-center gap-1.5 font-medium text-text">
			<span class="size-2 shrink-0 rounded-full" style="background: {tip.shift.color}"></span>
			<span class="truncate">{tip.shift.name}</span>
		</p>
		<p class="text-text-subtle">{formatShortDate(tip.shift.start)} · {formatTime(tip.shift.start)}–{formatTime(tip.shift.end)}</p>
		<p class="mt-2 text-text">{reason(tip.cell)}</p>
		<dl class="mt-2 space-y-0.5 text-text-muted">
			<div class="flex justify-between gap-3">
				<dt>{m.attendance_tip_present()}</dt>
				<dd class="tabular-nums">{tip.cell.percent === null ? m.attendance_tip_untracked() : `${tip.cell.percent}%`}</dd>
			</div>
			<div class="flex justify-between gap-3">
				<dt>{m.attendance_tip_slot()}</dt>
				<dd class="min-w-0 truncate">{tip.cell.slot ?? m.attendance_tip_no_slot()}</dd>
			</div>
			<div class="flex justify-between gap-3 font-medium text-text">
				<dt>{m.attendance_tip_points()}</dt>
				<dd class="font-mono tabular-nums {tone(tip.cell.points)}">
					{tip.cell.points > 0 ? '+' : ''}{formatNumber(tip.cell.points)}
				</dd>
			</div>
		</dl>
	</div>
{/if}
