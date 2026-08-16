<script lang="ts">
	import Toggle from '$lib/components/ui/Toggle.svelte';

	/**
	 * One automated action: whether the bot fires it on its own, and how far
	 * from the shift it does so.
	 *
	 * The slash command behind each of these keeps working either way — this
	 * only decides whether a human has to run it. The lead input is hidden
	 * while the action is off, because a lead time for something that never
	 * fires is noise.
	 */
	interface Props {
		label: string;
		description: string;
		enabled: boolean;
		lead: number;
		/** Wording for the offset, since one action runs after the shift. */
		leadLabel?: string;
		disabled?: boolean;
		onchange: (patch: { enabled?: boolean; lead?: number }) => void;
	}

	let {
		label,
		description,
		enabled,
		lead,
		leadLabel = 'minutes before the shift starts',
		disabled = false,
		onchange
	}: Props = $props();

	function commitLead(event: Event) {
		const next = Number((event.currentTarget as HTMLInputElement).value);
		if (!Number.isFinite(next) || next < 0) return;
		if (next !== lead) onchange({ lead: Math.round(next) });
	}
</script>

<div class="rounded-lg border border-border-base px-3 py-2.5">
	<Toggle
		checked={enabled}
		{label}
		{description}
		{disabled}
		onchange={(value) => onchange({ enabled: value })}
	/>

	{#if enabled}
		<div class="mt-3 flex items-center gap-2 border-t border-border-base pt-3">
			<input
				type="number"
				min="0"
				max="20160"
				value={lead}
				{disabled}
				aria-label="{label}: {leadLabel}"
				onblur={commitLead}
				class="w-20 rounded-lg border border-border-base bg-background-secondary px-2 py-1.5
					text-sm text-text focus:border-accent focus:outline-none"
			/>
			<span class="text-xs text-text-muted">{leadLabel}</span>
		</div>
	{/if}
</div>
