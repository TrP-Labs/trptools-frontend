<script lang="ts">
	import { IconCalendarPlus, IconCheck, IconRadio, IconUsers } from '@tabler/icons-svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import EmptyState from '$lib/components/ui/EmptyState.svelte';
	import Avatar from '$lib/components/users/Avatar.svelte';
	import { formatCountdown, formatDateTime } from '$lib/utils/format';
	import type { DashboardShift } from '$lib/api/types';
	import { m } from '$lib/paraglide/messages.js';

	interface Props {
		/** Every upcoming shift across every group, soonest first. */
		shifts: DashboardShift[];
		/**
		 * Open dispatch rooms by group id.
		 *
		 * A map rather than one room: the shift this card lands on moves as
		 * the clock passes it, and a single room id would then belong to a
		 * different group than the one on screen.
		 */
		rooms?: Record<string, string | null>;
	}

	let { shifts, rooms = {} }: Props = $props();

	// One clock for the card. It is the only thing on the page that has to
	// re-render every second, so nothing else is allowed to depend on it.
	let now = $state(Date.now());

	$effect(() => {
		const timer = setInterval(() => (now = Date.now()), 1000);
		return () => clearInterval(timer);
	});

	/**
	 * A shift already running beats one starting later, so somebody arriving
	 * mid-shift is not shown tomorrow's instead.
	 */
	let next = $derived.by(() => {
		const running = shifts.find(
			(shift) => new Date(shift.start).getTime() <= now && new Date(shift.end).getTime() > now
		);

		return running ?? shifts.find((shift) => new Date(shift.end).getTime() > now) ?? null;
	});

	let startsIn = $derived(next ? new Date(next.start).getTime() - now : 0);
	let live = $derived(Boolean(next) && startsIn <= 0);
	let roomId = $derived(next ? (rooms[next.groupId] ?? null) : null);
</script>

{#if !next}
	<EmptyState
		title={m.dashboard_next_shift_card_nothing_coming_up()}
		description={m.dashboard_next_shift_card_no_shift_scheduled_next_fortnight_across()}
	>
		{#snippet icon()}<IconCalendarPlus size={26} stroke={1.5} />{/snippet}
	</EmptyState>
{:else}
	<div
		class="card relative overflow-hidden p-6 sm:p-8"
		style="background:
			radial-gradient(120% 140% at 100% 0%, color-mix(in srgb, {next.color} 18%, transparent), transparent 70%),
			var(--surface);"
	>
		<span class="absolute inset-x-0 top-0 h-1" style="background: {next.color}"></span>

		<div class="flex flex-wrap items-center gap-2">
			<p class="text-xs font-semibold tracking-wide text-text-subtle uppercase">
				{live ? m.dashboard_next_shift_card_running_now() : m.dashboard_next_shift_card_next_shift()}
			</p>
			{#if live && roomId}
				<Badge tone="success"><IconRadio size={12} /> {m.dashboard_next_shift_card_room_open()}</Badge>
			{/if}
			{#if next.signedUp}
				<Badge tone="accent"><IconCheck size={12} /> {m.dashboard_next_shift_card_are_signed_up()}</Badge>
			{/if}
		</div>

		<h2 class="mt-2 text-2xl font-semibold tracking-tight text-text wrap-anywhere">
			{next.name}
		</h2>

		<a
			href="/g/{next.groupSlug}"
			class="mt-2 inline-flex min-w-0 max-w-full items-center gap-2 text-sm text-text-muted
				transition-colors hover:text-text"
		>
			<Avatar src={next.groupIcon} name={next.groupName} size={18} />
			<span class="min-w-0 truncate">{next.groupName}</span>
		</a>

		<p
			class="mt-6 font-mono text-4xl font-semibold text-text tabular-nums sm:text-5xl"
			aria-live="polite"
		>
			{live
				? formatCountdown(new Date(next.end).getTime() - now)
				: formatCountdown(startsIn)}
		</p>
		<p class="mt-1.5 text-xs text-text-subtle">
			{live ? 'remaining' : 'until it starts'} · {formatDateTime(next.start)}
		</p>

		<div class="mt-6 flex flex-wrap items-center gap-2">
			<Button href="/g/{next.groupSlug}/shift/{next.slug}">
				{'View Shift'}
			</Button>

			{#if roomId}
				<Button variant="secondary" href="/dashboard/{next.groupSlug}/dispatch">
					<IconRadio size={16} /> {m.dashboard_next_shift_card_join_dispatch()}
				</Button>
			{/if}

			{#if next.capacity > 0}
				<span class="inline-flex items-center gap-1.5 text-xs text-text-subtle">
					<IconUsers size={14} />
					{next.filled}/{next.capacity} signed up
				</span>
			{/if}
		</div>
	</div>
{/if}
