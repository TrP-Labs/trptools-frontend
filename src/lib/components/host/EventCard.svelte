<script lang="ts">
	/**
	 * One step of the host's timeline.
	 *
	 * Drawn two ways. In the list it is one compact row, so a host can read the
	 * whole shift at a glance. `featured` is the step that wants attention
	 * next, drawn large with its buttons in reach and keyboard shortcuts
	 * beside them — the same idea as the dispatch board's cursor: the next
	 * thing to do should never need hunting for.
	 */
	import { IconCheck, IconClock, IconPlayerPlay, IconPlayerSkipForward, IconRobot, IconUser } from '@tabler/icons-svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import TimingFields from './TimingFields.svelte';
	import type { HostEvent } from '$lib/api/types';
	import { formatCountdown, formatTime } from '$lib/utils/format';
	import { m } from '$lib/paraglide/messages.js';

	type Operation = 'ACTIVATE' | 'ACKNOWLEDGE' | 'SKIP';

	let {
		item,
		now,
		busy = false,
		featured = false,
		/** Why Activate cannot work for this step right now, if it cannot. */
		blocked = null,
		onaction,
		ontime
	}: {
		item: HostEvent;
		now: number;
		busy?: boolean;
		featured?: boolean;
		blocked?: string | null;
		onaction: (operation: Operation) => void;
		ontime: (reference: 'START' | 'END', offsetMinutes: number) => void;
	} = $props();

	let editing = $state(false);
	let reference = $state<'START' | 'END'>('START');
	let offsetMinutes = $state(0);

	// Ignored only means nobody acted in time: it can still be done late.
	let actionable = $derived(
		item.status === 'WAITING' || item.status === 'READY' || item.status === 'IGNORED' || Boolean(item.awaitingAck)
	);
	let movable = $derived((actionable || item.status === 'SKIPPED') && !item.awaitingAck);
	let due = $derived(item.dueAt <= now);
	let imminent = $derived(actionable && item.dueAt - now <= 30000 && item.dueAt > now);

	let labels = $derived({
		WAITING: m.host_status_waiting(),
		READY: m.host_status_ready(),
		QUEUED: m.host_status_queued(),
		RUNNING: m.host_status_running(),
		ACKNOWLEDGED: m.host_status_acknowledged(),
		AUTOMATED: m.host_status_automated(),
		ACTIVATED: m.host_status_activated(),
		SKIPPED: m.host_status_skipped(),
		IGNORED: m.host_status_ignored()
	});
	const defaults: Record<string, string> = {
		staff: 'Open to staff',
		edit: 'Edit shift information',
		public: 'Open to the public',
		complete: 'Complete procedure',
		'return-depot': 'Have drivers return to their depot'
	};
	let title = $derived(
		item.label !== defaults[item.id]
			? item.label
			: (({
					staff: m.host_staff_label(),
					edit: m.host_edit_label(),
					public: m.host_public_label(),
					complete: m.host_complete_label(),
					'return-depot': m.host_depot_label()
				}) as Record<string, string>)[item.id] ?? item.label
	);
	let audience = $derived(
		item.audience === 'DISPATCH'
			? m.host_audience_dispatch()
			: item.audience === 'ALL'
				? m.host_audience_all()
				: m.host_audience_host()
	);

	function act(operation: Operation) {
		if (busy) return;
		if (operation === 'ACTIVATE' && (blocked || item.awaitingAck)) return;
		onaction(operation);
	}

	/** Shortcuts belong to the featured card only, and never to a field being typed in. */
	function onkeydown(event: KeyboardEvent) {
		if (!featured || !actionable || editing || event.metaKey || event.ctrlKey || event.altKey) return;
		const target = event.target as HTMLElement | null;
		if (target?.closest('input, textarea, select, [contenteditable="true"], [role="listbox"], dialog')) return;
		const key = event.key.toLowerCase();
		const operation: Operation | null = key === 'a' ? 'ACTIVATE' : key === 'k' ? 'ACKNOWLEDGE' : key === 's' ? 'SKIP' : null;
		if (!operation) return;
		event.preventDefault();
		act(operation);
	}
</script>

<svelte:window {onkeydown} />

<article
	class="card min-w-0 transition-all duration-300 {featured ? 'featured p-5' : 'p-3.5'}"
	class:imminent
	class:handled={!actionable && item.status !== 'SKIPPED'}
	class:skipped={item.status === 'SKIPPED'}
	class:ignored={item.status === 'IGNORED'}
	data-event={item.id}
	data-status={item.status}
>
	<div class="flex min-w-0 items-start gap-3 sm:items-center">
		<div class="w-[4.75rem] shrink-0 text-left">
			<p class="font-mono text-sm font-semibold whitespace-nowrap text-text tabular-nums">{formatTime(new Date(item.dueAt))}</p>
			<p class="text-[11px] text-text-subtle tabular-nums">
				{#if actionable}{due ? m.host_time_due() : formatCountdown(item.dueAt - now)}{:else}{labels[item.status]}{/if}
			</p>
		</div>

		<div class="min-w-0 flex-1">
			<h3 class="wrap-anywhere font-semibold text-text {featured ? 'text-lg' : 'text-sm'}">{title}</h3>
			<div class="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-muted">
				<span class="inline-flex items-center gap-1"><IconUser size={12} />{audience}</span>
				<span class="inline-flex items-center gap-1">
					{#if item.automation}<IconRobot size={12} />{m.host_automation()}{:else}<IconCheck size={12} />{m.host_manual()}{/if}
				</span>
				{#if item.optional}<span>{m.host_optional()}</span>{/if}
				{#if actionable && item.status !== 'WAITING'}<span class="status {item.status === 'IGNORED' ? 'late' : 'ready'}">{item.awaitingAck ? m.host_status_activated() : labels[item.status]}</span>{/if}
			</div>
		</div>

	</div>

	{#if actionable || movable}
		<div class="flex flex-wrap gap-2 {featured ? 'mt-4' : 'mt-3 sm:pl-[5.5rem]'}">
			{#if actionable}
				<Button size={featured ? 'md' : 'sm'} disabled={busy || item.awaitingAck || Boolean(blocked)} title={blocked ?? undefined} onclick={() => act('ACTIVATE')}>
					<IconPlayerPlay size={15} />{m.host_activate()}{#if featured}<kbd>A</kbd>{/if}
				</Button>
				<Button size={featured ? 'md' : 'sm'} variant="secondary" disabled={busy} onclick={() => act('ACKNOWLEDGE')}>
					<IconCheck size={15} />{m.host_acknowledge()}{#if featured}<kbd>K</kbd>{/if}
				</Button>
				<Button size={featured ? 'md' : 'sm'} variant="ghost" disabled={busy} onclick={() => act('SKIP')}>
					<IconPlayerSkipForward size={15} />{m.host_skip()}{#if featured}<kbd>S</kbd>{/if}
				</Button>
			{/if}
			{#if movable}
				<Button
					size={featured ? 'md' : 'sm'}
					variant="ghost"
					onclick={() => {
						reference = item.reference;
						offsetMinutes = item.offsetMinutes;
						editing = !editing;
					}}><IconClock size={15} />{m.host_change_time()}</Button
				>
			{/if}
		</div>
		{#if blocked && actionable}<p class="mt-2 text-xs text-warning">{blocked}</p>{/if}
	{/if}

	{#if editing}
		<div class="mt-4 border-t border-border-base pt-4">
			<TimingFields bind:reference bind:offsetMinutes />
			<div class="mt-3 flex gap-2">
				<Button
					size="sm"
					disabled={busy}
					onclick={() => {
						ontime(reference, offsetMinutes);
						editing = false;
					}}>{m.host_save_time()}</Button
				><Button size="sm" variant="ghost" onclick={() => (editing = false)}>{m.host_cancel()}</Button>
			</div>
		</div>
	{/if}
</article>

<style>
	.featured {
		border-color: color-mix(in srgb, var(--color-accent) 45%, var(--color-border-base));
		background: color-mix(in srgb, var(--color-accent) 6%, var(--color-surface));
	}
	.imminent {
		border-color: var(--color-accent);
		box-shadow: 0 0 0 1px var(--color-accent);
	}
	.handled {
		opacity: 0.55;
	}
	.skipped {
		opacity: 0.7;
		border-style: dashed;
	}
	.ignored {
		border-color: color-mix(in srgb, var(--color-warning) 55%, var(--color-border-base));
	}
	.status {
		border-radius: 9999px;
		padding: 0 0.5rem;
		font-weight: 500;
	}
	.status.ready {
		background: color-mix(in srgb, var(--color-accent) 15%, transparent);
		color: var(--color-accent);
	}
	.status.late {
		background: color-mix(in srgb, var(--color-warning) 15%, transparent);
		color: var(--color-warning);
	}
	kbd {
		margin-left: 0.25rem;
		border: 1px solid currentColor;
		border-radius: 0.25rem;
		padding: 0 0.3rem;
		font-family: inherit;
		font-size: 0.7rem;
		opacity: 0.6;
	}
	/* Shortcuts are for a keyboard; on a phone the hint is only clutter. */
	@media (max-width: 639px) {
		kbd {
			display: none;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		article {
			transition: none;
		}
	}
</style>
