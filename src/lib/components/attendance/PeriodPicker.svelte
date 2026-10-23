<script lang="ts">
	/**
	 * Which month or quarter the Attendance page counts.
	 *
	 * Every tab reads the same period, so the picker sits above the tabs'
	 * content rather than inside any one of them. Working a period out is the
	 * expensive part of the page — every shift, every sign-up and a Roblox
	 * lookup per person — so while one is loading the whole control greys out
	 * and spins rather than queueing a second request behind the first.
	 */
	import { IconChevronLeft, IconChevronRight } from '@tabler/icons-svelte';
	import Spinner from '$lib/components/ui/Spinner.svelte';
	import { kindOf, periodOf, periodStart, stepPeriod, type PeriodKind } from '$lib/utils/attendancePeriod';
	import { m } from '$lib/paraglide/messages.js';

	interface Props {
		period: string;
		loading?: boolean;
		onperiod: (period: string) => void;
		onkind: (kind: PeriodKind) => void;
	}

	let { period, loading = false, onperiod, onkind }: Props = $props();

	let kind = $derived(kindOf(period));
	let latest = $derived(periodOf(new Date(), kind));

	let label = $derived.by(() => {
		const start = periodStart(period);
		if (kind === 'MONTH') {
			return new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(start);
		}
		const months = new Intl.DateTimeFormat(undefined, { month: 'short', timeZone: 'UTC' });
		const end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 2, 1));
		return m.attendance_quarter_label({
			quarter: period.slice(-1),
			year: String(start.getUTCFullYear()),
			range: `${months.format(start)}–${months.format(end)}`
		});
	});
</script>

<div class="flex flex-wrap items-center gap-2" aria-busy={loading}>
	<div class="flex rounded-lg border border-border-base bg-surface p-1" role="radiogroup" aria-label={m.attendance_period()}>
		{#each [{ id: 'MONTH', label: m.attendance_monthly() }, { id: 'QUARTER', label: m.attendance_quarterly() }] as option (option.id)}
			<button
				type="button"
				role="radio"
				aria-checked={kind === option.id}
				disabled={loading}
				class="rounded-md px-3 py-1 text-sm transition-colors disabled:cursor-wait
					{kind === option.id ? 'bg-accent/15 font-medium text-text' : 'text-text-muted hover:text-text'}"
				onclick={() => kind !== option.id && onkind(option.id as PeriodKind)}
			>
				{option.label}
			</button>
		{/each}
	</div>

	<div class="flex items-center gap-1 rounded-lg border border-border-base bg-surface p-1">
		<button
			type="button"
			class="rounded-md p-1.5 text-text-muted hover:bg-background-muted hover:text-text disabled:cursor-wait disabled:opacity-40"
			aria-label={kind === 'MONTH' ? m.promotions_previous_month() : m.attendance_previous_quarter()}
			disabled={loading}
			onclick={() => onperiod(stepPeriod(period, -1))}
		>
			<IconChevronLeft size={16} />
		</button>
		<span class="flex min-w-40 items-center justify-center gap-2 text-center text-sm font-medium text-text" data-testid="period">
			{#if loading}<Spinner size={13} />{/if}
			{label}
		</span>
		<button
			type="button"
			class="rounded-md p-1.5 text-text-muted hover:bg-background-muted hover:text-text disabled:opacity-40
				{loading ? 'disabled:cursor-wait' : ''}"
			aria-label={kind === 'MONTH' ? m.promotions_next_month() : m.attendance_next_quarter()}
			disabled={loading || period >= latest}
			onclick={() => onperiod(stepPeriod(period, 1))}
		>
			<IconChevronRight size={16} />
		</button>
	</div>
</div>
