<script lang="ts">
	import { IconCalendarPlus, IconPlayerPlay, IconRadio } from '@tabler/icons-svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import EmptyState from '$lib/components/ui/EmptyState.svelte';
	import { formatCountdown, formatDateTime } from '$lib/utils/format';
	import type { ShiftOccurrence } from '$lib/api/types';

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
		title="No shift coming up"
		description={canHost
			? 'A dispatch room is opened for a scheduled shift. Add one to the schedule and it will appear here.'
			: 'There is nothing scheduled, so no room can be opened yet.'}
	>
		{#snippet icon()}<IconRadio size={28} stroke={1.5} />{/snippet}
		{#snippet action()}
			{#if canHost}
				<Button href={manageHref}><IconCalendarPlus size={16} /> Manage shifts</Button>
			{/if}
		{/snippet}
	</EmptyState>
{:else}
	<div class="card p-6 text-center sm:p-8">
		<span class="mt-1 mb-2 inline-block h-1 w-10 rounded-full" style="background: {next.color}"></span>

		<p class="text-xs font-semibold tracking-wide text-text-subtle uppercase">
			{live ? 'Running now' : 'Next shift'}
		</p>

		<h2 class="mt-1 text-xl font-semibold text-text">{next.name}</h2>
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
					<IconPlayerPlay size={18} /> Open room
				</Button>

				<p class="mt-2.5 text-xs text-text-subtle">
					{#if unlocked}
						Everyone with dispatch access can join once the room is open.
					{:else}
						Unlocks {lead}.
					{/if}
				</p>
			</div>
		{:else}
			<p class="mt-7 text-sm text-text-muted">A host needs to open the room before you can join.</p>
		{/if}
	</div>
{/if}
