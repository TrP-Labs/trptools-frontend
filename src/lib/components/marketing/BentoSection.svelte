<script lang="ts">
	/** A titled group of cards: what a group uses this part of TrPTools for. */
	import type { Snippet } from 'svelte';
	import FeatureCard from './FeatureCard.svelte';
	import type { Feature } from './feature';

	let { id, tint = '', eyebrow, title, intro, features, visuals, children }: {
		id: string;
		/** A color class from marketing.css, inherited by every card in the section. */
		tint?: string;
		eyebrow: string;
		title: string;
		intro?: string;
		features: Feature[];
		visuals?: Record<string, Snippet>;
		/** Cards drawn before the feature list, for ones with their own markup. */
		children?: Snippet;
	} = $props();
</script>

<section {id} class="section {tint}" aria-labelledby="{id}-title">
	<header class="section-head">
		<div><p class="eyebrow">{eyebrow}</p><h2 id="{id}-title">{title}</h2></div>
		{#if intro}<p>{intro}</p>{/if}
	</header>
	<div class="bento">
		{@render children?.()}
		{#each features as feature, i (i)}<FeatureCard {feature} {visuals} index={i} />{/each}
	</div>
</section>
