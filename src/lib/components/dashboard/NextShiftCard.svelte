<script lang="ts">
	import { IconCalendarPlus, IconCheck, IconRadio, IconUsers } from '@tabler/icons-svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import EmptyState from '$lib/components/ui/EmptyState.svelte';
	import Avatar from '$lib/components/users/Avatar.svelte';
	import { formatCountdown, formatDateTime } from '$lib/utils/format';
	import { shiftLink } from '$lib/utils/shiftLink';
	import type { DashboardShift } from '$lib/api/types';
	import { m } from '$lib/paraglide/messages.js';
	import { localized, localizedGroup } from '$lib/utils/translations';

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
		mode?: 'user' | 'host';
	}

	let { shifts, rooms = {}, mode = 'host' }: Props = $props();

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
		description={mode === 'host' ? m.widget_host_shifts_empty() : m.widget_no_shifts()}
	>
		{#snippet icon()}<IconCalendarPlus size={26} stroke={1.5} />{/snippet}
		{#snippet action()}<Button variant="secondary" href={mode === 'host' ? '/dashboard' : '/groups'}>{mode === 'host' ? m.home_all_groups() : m.shifts_browse_groups()}</Button>{/snippet}
	</EmptyState>
{:else}
	<div
		class="card relative flex flex-1 flex-col overflow-hidden p-5"
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
			{localized(next, 'name')}
		</h2>

		<a
			href="/g/{next.groupSlug}"
			class="mt-2 inline-flex min-w-0 self-start max-w-full items-center gap-2 text-sm text-text-muted
				transition-colors hover:text-text"
		>
			<Avatar src={next.groupIcon} name={localizedGroup(next)} size={18} />
			<span class="min-w-0 truncate">{localizedGroup(next)}</span>
		</a>

		<p
			class="mt-6 font-mono text-4xl font-semibold text-text tabular-nums @lg:text-5xl"
		>
			{live
				? formatCountdown(new Date(next.end).getTime() - now)
				: formatCountdown(startsIn)}
		</p>
		<p class="mt-1.5 text-xs text-text-subtle">
			{live ? m.home_countdown_remaining() : m.home_countdown_until()} · {formatDateTime(next.start)}
		</p>

		<div class="mt-auto flex flex-wrap items-center gap-2 pt-6">
			<Button href={shiftLink(next)}>
				{m.home_view_shift()}
			</Button>

			{#if roomId}
				<Button variant="secondary" href="/dashboard/{next.groupSlug}/dispatch">
					<IconRadio size={16} /> {m.dashboard_next_shift_card_join_dispatch()}
				</Button>
			{/if}

			{#if next.capacity > 0}
				<span class="inline-flex items-center gap-1.5 text-xs text-text-subtle">
					<IconUsers size={14} />
					{m.dashboard_next_shift_card_signed_up({ filled: next.filled, capacity: next.capacity })}
				</span>
			{/if}
		</div>
	</div>
{/if}
