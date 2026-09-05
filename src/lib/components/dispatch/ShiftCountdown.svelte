<script lang="ts">
	import { IconCalendarPlus, IconPlayerPlay, IconRadio } from '@tabler/icons-svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import EmptyState from '$lib/components/ui/EmptyState.svelte';
	import { formatCountdown, formatDateTime } from '$lib/utils/format';
	import type { ShiftOccurrence } from '$lib/api/types';
	import { m } from '$lib/paraglide/messages.js';
	import { localized } from '$lib/utils/translations';

	interface Props {
		/** Upcoming occurrences across the group, soonest first. */
		occurrences: ShiftOccurrence[];
		/** Minutes before a shift starts that its room may open. */
		leadMinutes: number;
		canHost: boolean;
		opening: boolean;
		manageHref: string;
		onopen: (eventId: string) => void;
	}

	let { occurrences, leadMinutes, canHost, opening, manageHref, onopen }: Props = $props();

	// One clock for the whole panel. The countdown is the only thing on the
	// page that needs to re-render every second.
	let now = $state(Date.now());

	$effect(() => {
		const timer = setInterval(() => (now = Date.now()), 1000);
		return () => clearInterval(timer);
	});

	/**
	 * The shift the host actually wants.
	 *
	 * A shift already under way beats one starting later, so a host arriving
	 * mid-shift is not offered tomorrow's instead.
	 */
	let next = $derived.by(() => {
		const sorted = [...occurrences].sort(
			(a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()
		);

		const running = sorted.find(
			(occurrence) =>
				new Date(occurrence.start).getTime() <= now && new Date(occurrence.end).getTime() > now
		);

		return running ?? sorted.find((occurrence) => new Date(occurrence.end).getTime() > now) ?? null;
	});

	let startsIn = $derived(next ? new Date(next.start).getTime() - now : 0);
	let live = $derived(Boolean(next) && startsIn <= 0);
	let unlocked = $derived(Boolean(next) && startsIn <= leadMinutes * 60_000);

	let lead = $derived(
		leadMinutes === 0
			? 'once it starts'
			: `${leadMinutes} ${leadMinutes === 1 ? 'minute' : 'minutes'} before it starts`
	);
</script>

{#if !next}
	<EmptyState
		title={m.dispatch_shift_countdown_no_shift_coming_up()}
		description={canHost
			? m.dispatch_shift_countdown_dispatch_room_opened_scheduled_shift_add()
			: m.dispatch_shift_countdown_there_nothing_scheduled_so_no_room()}
	>
		{#snippet icon()}<IconRadio size={28} stroke={1.5} />{/snippet}
		{#snippet action()}
			{#if canHost}
				<Button href={manageHref}><IconCalendarPlus size={16} /> {m.dispatch_shift_countdown_manage_shifts()}</Button>
			{/if}
		{/snippet}
	</EmptyState>
{:else}
	<div class="card p-6 text-center sm:p-8">
		<span class="mt-1 mb-2 inline-block h-1 w-10 rounded-full" style="background: {next.color}"></span>

		<p class="text-xs font-semibold tracking-wide text-text-subtle uppercase">
			{live ? m.dispatch_shift_countdown_running_now() : m.dispatch_shift_countdown_next_shift()}
		</p>

		<h2 class="mt-1 text-xl font-semibold text-text">{localized(next, 'name')}</h2>
		<p class="mt-1 text-sm text-text-muted">{formatDateTime(next.start)}</p>

		<p
			class="mt-6 font-mono text-4xl font-semibold text-text tabular-nums sm:text-5xl"
			aria-live="polite"
		>
			{live ? formatCountdown(new Date(next.end).getTime() - now) : formatCountdown(startsIn)}
		</p>
		<p class="mt-1.5 text-xs text-text-subtle">
			{live ? 'remaining' : 'until it starts'}
		</p>

		{#if canHost}
			<div class="mt-7">
				<Button size="lg" disabled={!unlocked} loading={opening} onclick={() => onopen(next.eventId)}>
					<IconPlayerPlay size={18} /> {m.dispatch_shift_countdown_open_room()}
				</Button>

				<p class="mt-2.5 text-xs text-text-subtle">
					{#if unlocked}
						{m.dispatch_shift_countdown_everyone_can_join()}
					{:else}
						{m.dispatch_shift_countdown_unlocks({ when: lead })}
					{/if}
				</p>
			</div>
		{:else}
			<p class="mt-7 text-sm text-text-muted">{m.dispatch_shift_countdown_host_needs_open_room_before_can()}</p>
		{/if}
	</div>
{/if}
