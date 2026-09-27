<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';
	import TimingFields from './TimingFields.svelte';
	import type { HostEvent } from '$lib/api/types';
	import { formatCountdown, formatDateTime } from '$lib/utils/format';
	import { m } from '$lib/paraglide/messages.js';
	let {
		item,
		now,
		busy = false,
		onaction,
		ontime,
	}: {
		item: HostEvent;
		now: number;
		busy?: boolean;
		onaction: (operation: 'ACTIVATE' | 'ACKNOWLEDGE' | 'SKIP') => void;
		ontime: (reference: 'START' | 'END', offsetMinutes: number) => void;
	} = $props();
	let editing = $state(false);
	let reference = $state<'START' | 'END'>('START');
	let offsetMinutes = $state(0);
	let actionable = $derived(
		item.status === 'WAITING' ||
			item.status === 'READY' ||
			Boolean(item.awaitingAck),
	);
	let imminent = $derived(
		actionable && item.dueAt - now <= 30000 && item.dueAt > now,
	);
	let labels = $derived({
		WAITING: m.host_status_waiting(),
		READY: m.host_status_ready(),
		QUEUED: m.host_status_queued(),
		RUNNING: m.host_status_running(),
		ACKNOWLEDGED: m.host_status_acknowledged(),
		AUTOMATED: m.host_status_automated(),
		ACTIVATED: m.host_status_activated(),
		SKIPPED: m.host_status_skipped(),
		IGNORED: m.host_status_ignored(),
	});
	const defaults: Record<string, string> = {
		staff: 'Open to staff',
		edit: 'Edit shift information',
		public: 'Open to the public',
		complete: 'Complete procedure',
		'return-depot': 'Have drivers return to their depot',
	};
	let title = $derived(
		item.label !== defaults[item.id]
			? item.label
			: ((
					{
						staff: m.host_staff_label(),
						edit: m.host_edit_label(),
						public: m.host_public_label(),
						complete: m.host_complete_label(),
						'return-depot': m.host_depot_label(),
					} as Record<string, string>
				)[item.id] ?? item.label),
	);
</script>

<article
	class="card min-w-0 p-4 transition-all duration-300"
	class:imminent
	class:handled={!actionable || item.status === 'ACTIVATED'}
	class:skipped={item.status === 'SKIPPED'}
	class:ignored={item.status === 'IGNORED'}
	data-event={item.id}
	data-status={item.status}
>
	<div class="flex flex-col items-start justify-between gap-3 sm:flex-row">
		<div class="min-w-0 flex-1">
			<h3 class="wrap-anywhere font-semibold text-text">{title}</h3>
			<div class="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-text-muted">
				<span
					>{m.host_responsibility({
						audience:
							item.audience === 'DISPATCH'
								? m.host_audience_dispatch()
								: item.audience === 'ALL'
									? m.host_audience_all()
									: m.host_audience_host(),
					})}</span
				>{#if item.optional}<span>{m.host_optional()}</span>{/if}<span
					>{item.automation ? m.host_automation() : m.host_manual()}</span
				>
			</div>
		</div>
		<div class="text-left sm:text-right">
			<p class="font-mono text-lg font-semibold text-text tabular-nums">
				{actionable
					? item.dueAt > now
						? formatCountdown(item.dueAt - now)
						: m.host_time_due()
					: labels[item.status]}
			</p>
			<p class="text-xs text-text-subtle">
				{formatDateTime(new Date(item.dueAt))}
			</p>
		</div>
	</div>
	{#if actionable}
		<div class="mt-4 flex flex-wrap gap-2">
			<Button
				size="sm"
				disabled={busy || item.awaitingAck}
				onclick={() => onaction('ACTIVATE')}>{m.host_activate()}</Button
			>
			<Button
				size="sm"
				variant="secondary"
				disabled={busy}
				onclick={() => onaction('ACKNOWLEDGE')}>{m.host_acknowledge()}</Button
			>
			<Button
				size="sm"
				variant="ghost"
				disabled={busy}
				onclick={() => onaction('SKIP')}>{m.host_skip()}</Button
			>
			<Button
				size="sm"
				variant="ghost"
				disabled={item.awaitingAck}
				onclick={() => {
					reference = item.reference;
					offsetMinutes = item.offsetMinutes;
					editing = !editing;
				}}>{m.host_change_time()}</Button
			>
		</div>
		{#if editing}<div class="mt-4 border-t border-border-base pt-4">
				<TimingFields bind:reference bind:offsetMinutes />
				<div class="mt-3 flex gap-2">
					<Button
						size="sm"
						disabled={busy}
						onclick={() => {
							ontime(reference, offsetMinutes);
							editing = false;
						}}>{m.host_save_time()}</Button
					><Button size="sm" variant="ghost" onclick={() => (editing = false)}
						>{m.host_cancel()}</Button
					>
				</div>
			</div>{/if}
	{/if}
</article>

<style>
	.imminent {
		border-color: var(--color-accent);
		padding-block: 1.35rem;
		box-shadow: 0 0 0 1px var(--color-accent);
	}
	.handled {
		opacity: 0.55;
	}
	.skipped {
		border-color: var(--color-danger);
		background: color-mix(
			in srgb,
			var(--color-danger) 8%,
			var(--color-surface)
		);
	}
	.ignored {
		border-color: var(--color-warning);
		background: color-mix(
			in srgb,
			var(--color-warning) 8%,
			var(--color-surface)
		);
	}
	@media (prefers-reduced-motion: reduce) {
		article {
			transition: none;
		}
	}
</style>
