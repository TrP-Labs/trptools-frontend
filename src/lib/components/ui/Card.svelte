<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		title?: string;
		description?: string;
		class?: string;
		padded?: boolean;
		actions?: Snippet;
		/**
		 * Optional: a card whose whole content is one control puts it in
		 * `actions`, beside the line of text explaining it, and has no body
		 * at all. Rendering an empty padded box under that header is what
		 * made those cards twice as tall as they needed to be.
		 */
		children?: Snippet;
	}

	let {
		title,
		description,
		class: className = '',
		padded = true,
		actions,
		children
	}: Props = $props();
</script>

<section class="card {className}">
	{#if title || actions}
		<!-- The rule under the header separates it from a body. With no body
		     there is nothing to separate, and it reads as a line drawn under
		     the bottom edge of the card. -->
		<header
			class="flex flex-wrap items-start justify-between gap-3 px-5 py-4
				{children ? 'border-b border-border-base' : ''}"
		>
			<div class="min-w-0">
				{#if title}
					<h2 class="text-base font-semibold text-text">{title}</h2>
				{/if}
				{#if description}
					<p class="mt-1 text-sm text-text-muted">{description}</p>
				{/if}
			</div>
			{#if actions}
				<div class="flex shrink-0 flex-wrap items-center gap-2">{@render actions()}</div>
			{/if}
		</header>
	{/if}

	{#if children}
		<div class={padded ? 'p-5' : ''}>
			{@render children()}
		</div>
	{/if}
</section>
