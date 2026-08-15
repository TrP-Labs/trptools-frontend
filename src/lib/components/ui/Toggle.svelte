<script lang="ts">
	interface Props {
		checked: boolean;
		label: string;
		description?: string;
		disabled?: boolean;
		onchange?: (checked: boolean) => void;
	}

	let {
		checked = $bindable(false),
		label,
		description,
		disabled = false,
		onchange
	}: Props = $props();

	function toggle() {
		if (disabled) return;
		checked = !checked;
		onchange?.(checked);
	}
</script>

<div class="flex items-start justify-between gap-4">
	<div class="min-w-0">
		<p class="text-sm font-medium text-text">{label}</p>
		{#if description}
			<p class="mt-0.5 text-xs text-text-muted">{description}</p>
		{/if}
	</div>

	<button
		type="button"
		role="switch"
		aria-checked={checked}
		aria-label={label}
		{disabled}
		onclick={toggle}
		class="relative mt-0.5 h-6 w-11 shrink-0 rounded-full border transition-colors disabled:opacity-50
			{checked ? 'border-accent bg-accent' : 'border-border-strong bg-background-muted'}"
	>
		<span
			class="absolute top-0.5 size-4.5 rounded-full bg-white shadow transition-[left]
				{checked ? 'left-[1.375rem]' : 'left-0.5'}"
		></span>
	</button>
</div>
