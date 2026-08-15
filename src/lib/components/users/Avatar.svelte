<script lang="ts">
	interface Props {
		src?: string | null;
		name?: string | null;
		size?: number;
		class?: string;
	}

	let { src, name, size = 32, class: className = '' }: Props = $props();

	let initials = $derived(
		(name ?? '?')
			.trim()
			.split(/\s+/)
			.slice(0, 2)
			.map((part) => part[0] ?? '')
			.join('')
			.toUpperCase() || '?'
	);
</script>

{#if src}
	<img
		{src}
		alt=""
		width={size}
		height={size}
		loading="lazy"
		decoding="async"
		class="shrink-0 rounded-full bg-background-muted object-cover {className}"
		style="width: {size}px; height: {size}px;"
	/>
{:else}
	<span
		aria-hidden="true"
		class="inline-flex shrink-0 items-center justify-center rounded-full bg-background-muted font-semibold text-text-muted select-none {className}"
		style="width: {size}px; height: {size}px; font-size: {Math.max(10, size * 0.36)}px;"
	>
		{initials}
	</span>
{/if}
