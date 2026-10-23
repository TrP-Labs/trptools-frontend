<script lang="ts">
	/**
	 * Stop, continue and end shift: orders with no field on the board.
	 *
	 * A route or a tow reaches the driver by being set; these have nothing to
	 * set, so they are asked for. A popover of its own rather than
	 * `OverflowMenu`, because the keyboard cursor needs the trigger itself to
	 * land on, and Escape here must close the menu without leaving the row.
	 */
	import { IconHandStop, IconLogout, IconPlayerPlay, IconSpeakerphone } from '@tabler/icons-svelte';
	import { m } from '$lib/paraglide/messages.js';

	type Order = 'STOP' | 'CONTINUE' | 'END_SHIFT';

	interface Props {
		vehicleId: string;
		disabled?: boolean;
		ring?: string;
		element?: HTMLElement | null;
		onorder: (order: Order) => void;
	}

	let { vehicleId, disabled = false, ring = '', element = $bindable(null), onorder }: Props = $props();

	let open = $state(false);
	let root = $state<HTMLDivElement | null>(null);

	const orders: Array<{ id: Order; icon: typeof IconHandStop; label: () => string }> = [
		{ id: 'STOP', icon: IconHandStop, label: () => m.dispatch_live_stop() },
		{ id: 'CONTINUE', icon: IconPlayerPlay, label: () => m.dispatch_live_continue() },
		{ id: 'END_SHIFT', icon: IconLogout, label: () => m.dispatch_live_end_shift() }
	];

	function choose(order: Order) {
		open = false;
		onorder(order);
		element?.focus({ preventScroll: true });
	}
</script>

<svelte:window
	onpointerdown={(event) => {
		if (open && root && !root.contains(event.target as Node)) open = false;
	}}
/>

<div bind:this={root} class="relative shrink-0">
	<button
		bind:this={element}
		type="button"
		{disabled}
		aria-haspopup="menu"
		aria-expanded={open}
		aria-label={m.dispatch_live_orders({ vehicle: vehicleId })}
		title={m.dispatch_live_orders({ vehicle: vehicleId })}
		onclick={() => (open = !open)}
		onkeydown={(event) => {
			if (open && event.key === 'Escape') {
				event.preventDefault();
				event.stopPropagation();
				open = false;
			}
		}}
		class="rounded-md border border-border-base p-1.5 text-text-subtle transition-colors
			hover:border-accent hover:text-accent disabled:opacity-50 {ring}"
	>
		<IconSpeakerphone size={15} />
	</button>

	{#if open}
		<div
			role="menu"
			class="absolute right-0 z-30 mt-1 w-48 overflow-hidden rounded-lg border border-border-base
				bg-surface py-1 shadow-lg"
		>
			{#each orders as order (order.id)}
				<button
					type="button"
					role="menuitem"
					onclick={() => choose(order.id)}
					onkeydown={(event) => {
						if (event.key === 'Escape') {
							event.preventDefault();
							event.stopPropagation();
							open = false;
							element?.focus({ preventScroll: true });
						}
					}}
					class="flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors
						hover:bg-background-muted focus:bg-background-muted focus:outline-none
						{order.id === 'END_SHIFT' ? 'text-danger' : 'text-text'}"
				>
					<order.icon size={15} class="shrink-0" />
					{order.label()}
				</button>
			{/each}
		</div>
	{/if}
</div>
