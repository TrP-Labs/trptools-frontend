<script lang="ts">
	/**
	 * How long this shift has left.
	 *
	 * A dispatch room outlives its shift by design — it is kept alive for an
	 * hour afterwards so an overrun does not end mid-sentence. That is exactly
	 * why the board has to say when the shift itself is done: without it the
	 * only signal is the room eventually vanishing, which arrives long after
	 * anybody needed to know.
	 */
	import { IconClock } from '@tabler/icons-svelte';
	import Badge from '$lib/components/ui/Badge.svelte';

	interface Props {
		/** When the shift this room was opened for ends. */
		endsAt: string | Date | null;
	}

	let { endsAt }: Props = $props();

	let end = $derived(endsAt ? new Date(endsAt).getTime() : null);

	let now = $state(Date.now());

	$effect(() => {
		const timer = setInterval(() => (now = Date.now()), 1000);
		return () => clearInterval(timer);
	});

	let remaining = $derived(end === null ? null : end - now);
	let over = $derived(remaining !== null && remaining <= 0);

	/** h:mm:ss while there is an hour left, m:ss after that. */
	function countdown(ms: number): string {
		const total = Math.max(0, Math.floor(ms / 1000));
		const hours = Math.floor(total / 3600);
		const minutes = Math.floor((total % 3600) / 60);
		const seconds = total % 60;

		const pad = (value: number) => value.toString().padStart(2, '0');
		return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${minutes}:${pad(seconds)}`;
	}
</script>

{#if remaining !== null}
	{#if over}
		<Badge tone="danger">
			<span class="relative flex size-2">
				<span class="relative inline-flex size-2 rounded-full bg-current"></span>
			</span>
			Shift over
		</Badge>
	{:else}
		<Badge tone="neutral">
			<IconClock size={13} />
			<span class="font-mono tabular-nums" aria-live="off">{countdown(remaining)}</span>
			<span class="sr-only">until this shift ends</span>
		</Badge>
	{/if}
{/if}
