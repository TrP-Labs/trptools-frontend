<script lang="ts">
	interface Props {
		number: number;
		color?: string;
		/** An uploaded icon. Replaces the numbered tile when set. */
		icon?: string | null;
		name?: string;
		size?: 'sm' | 'md' | 'lg';
		class?: string;
	}

	let { number, color = '#4287f5', icon = null, name, size = 'md', class: className = '' }: Props = $props();

	// Matched to RouteBadge's sizes so a route and a depot sitting side by side
	// line up rather than one nudging the row taller.
	const sizing = {
		sm: { px: 34, text: 'text-sm', radius: 'rounded-lg' },
		md: { px: 46, text: 'text-base', radius: 'rounded-xl' },
		lg: { px: 76, text: 'text-2xl', radius: 'rounded-2xl' }
	} as const;

	let m = $derived(sizing[size]);
</script>

{#if icon}
	<img
		src={icon}
		alt={name ?? `Depot ${number}`}
		title={name ?? `Depot ${number}`}
		loading="lazy"
		decoding="async"
		class="shrink-0 object-contain select-none {m.radius} {className}"
		style="width: {m.px}px; height: {m.px}px;"
	/>
{:else}
	<span
		title={name ?? `Depot ${number}`}
		class="grid shrink-0 place-items-center font-mono font-bold text-white select-none
			{m.radius} {m.text} {className}"
		style="background: {color}; width: {m.px}px; height: {m.px}px;"
	>
		{number}
	</span>
{/if}
