<script lang="ts">
	import type { RouteShape } from '$lib/api/types';

	interface Props {
		label: string;
		color?: string;
		/** Ink for the label. Defaults to near-black, matching a printed roundel. */
		textColor?: string;
		shape?: RouteShape;
		/** An uploaded badge. Replaces the drawn roundel outright when set. */
		icon?: string | null;
		size?: 'xs' | 'sm' | 'md' | 'lg';
		class?: string;
	}

	let {
		label,
		color = '#4287f5',
		textColor = '#111111',
		shape = 'AUTO',
		icon = null,
		size = 'md',
		class: className = ''
	}: Props = $props();

	const MAX_LABEL = 10;

	let display = $derived((label ?? '').trim().slice(0, MAX_LABEL).toUpperCase() || '??');

	/**
	 * AUTO keeps the behaviour from the design prototype: short route numbers
	 * read as roundels, longer names as plates. An explicit shape always wins,
	 * which is what lets a group give a custom route its own identity.
	 */
	let resolvedShape = $derived(
		shape === 'AUTO' ? (display.length <= 2 ? 'CIRCLE' : 'RECTANGLE') : shape
	);

	// Ring thickness and text scale per size. The roundel look is a white face
	// inside a thick coloured band, so the band is a border rather than a fill.
	const sizing = {
		xs: { ring: 3, min: 26, text: 'text-[0.6rem]', pad: '0.15rem 0.4rem' },
		sm: { ring: 4, min: 34, text: 'text-xs', pad: '0.25rem 0.6rem' },
		md: { ring: 6, min: 46, text: 'text-sm', pad: '0.4rem 0.85rem' },
		lg: { ring: 9, min: 76, text: 'text-xl', pad: '0.7rem 1.4rem' }
	} as const;

	let m = $derived(sizing[size]);

	let clipPath = $derived(
		resolvedShape === 'DIAMOND'
			? 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)'
			: resolvedShape === 'HEXAGON'
				? 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)'
				: undefined
	);
</script>

{#if icon}
	<!--
		A group that has drawn its own badge gets it shown as-is. The colour and
		shape stay configured underneath so removing the image restores the
		roundel it had before.
	-->
	<img
		src={icon}
		alt={label}
		title={label}
		loading="lazy"
		decoding="async"
		class="shrink-0 rounded-md object-contain select-none {className}"
		style="width: {m.min}px; height: {m.min}px;"
	/>
{:else if resolvedShape === 'CIRCLE'}
	<span
		class="inline-flex shrink-0 items-center justify-center rounded-full bg-white text-center font-bold
			tracking-tight tabular-nums select-none {m.text} {className}"
		style="border: {m.ring}px solid {color}; color: {textColor};
			min-width: {m.min}px; height: {m.min}px; aspect-ratio: 1 / 1; padding: 0 0.2em;"
		title={label}
	>
		{display}
	</span>
{:else if clipPath}
	<!--
		Clipped shapes cannot use a border for the band, so an outer element
		carries the colour and an inset inner element provides the white face.
	-->
	<span
		class="inline-grid shrink-0 place-items-center select-none {className}"
		style="background: {color}; clip-path: {clipPath}; padding: {m.ring}px;
			min-width: {m.min * 1.6}px; min-height: {m.min * 1.15}px;"
		title={label}
	>
		<span
			class="grid h-full w-full place-items-center bg-white text-center font-bold tracking-tight {m.text}"
			style="clip-path: {clipPath}; color: {textColor}; padding: {m.pad};"
		>
			{display}
		</span>
	</span>
{:else}
	<span
		class="inline-flex shrink-0 items-center justify-center rounded-lg bg-white text-center font-bold
			tracking-tight whitespace-nowrap select-none {m.text} {className}"
		style="border: {m.ring}px solid {color}; color: {textColor}; padding: {m.pad};
			min-width: {m.min * 1.3}px; min-height: {m.min}px;"
		title={label}
	>
		{display}
	</span>
{/if}
