<script lang="ts">
	/**
	 * What this room is right now: connected, how long the shift has left, and
	 * who else is here.
	 *
	 * It sits beside the page title rather than out on the right with the
	 * buttons. Status is not something you press, and reading it should not
	 * mean crossing the header to the column of things that do things.
	 */
	import { IconUsers } from '@tabler/icons-svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import ShiftEndChip from './ShiftEndChip.svelte';
	import type { ConnectionStatus } from '$lib/stores/dispatch.svelte';

	interface Props {
		status: ConnectionStatus;
		/** When the shift this room was opened for ends. */
		endsAt: string | Date | null;
		presence: number;
		onpresence: () => void;
	}

	let { status, endsAt, presence, onpresence }: Props = $props();

	const tones = {
		idle: { label: 'Offline', tone: 'neutral' as const },
		connecting: { label: 'Connecting', tone: 'warning' as const },
		live: { label: 'Live', tone: 'success' as const },
		retrying: { label: 'Reconnecting', tone: 'warning' as const },
		closed: { label: 'Closed', tone: 'danger' as const }
	};
</script>

<Badge tone={tones[status].tone}>
	<span class="relative flex size-2">
		{#if status === 'live'}
			<span class="absolute inline-flex size-full animate-ping rounded-full bg-current opacity-70"
			></span>
		{/if}
		<span class="relative inline-flex size-2 rounded-full bg-current"></span>
	</span>
	{tones[status].label}
</Badge>

<ShiftEndChip {endsAt} />

<button
	type="button"
	onclick={onpresence}
	title="See who is in this room"
	class="inline-flex items-center gap-1.5 rounded-full border border-border-base px-2.5 py-0.5
		text-xs text-text-muted transition-colors hover:border-accent hover:text-text"
>
	<IconUsers size={13} />
	{presence}
</button>
