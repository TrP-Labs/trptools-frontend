<script lang="ts">
	/**
	 * A real screenshot of the dashboard, in the reader's theme.
	 *
	 * The theme is a class on <html> rather than a media query, so a
	 * `<picture>` cannot choose. Both images are in the markup and CSS hides
	 * one; a lazy image that is `display: none` is never fetched, so a reader
	 * downloads only the set their theme draws.
	 */
	let { name, themed = true, class: className = '' }: { name: string; themed?: boolean; class?: string } = $props();
</script>

{#if themed}
	<img src="/marketing/{name}-dim.webp" alt="" loading="lazy" decoding="async" class="shot dark {className}" />
	<img src="/marketing/{name}-light.webp" alt="" loading="lazy" decoding="async" class="shot light {className}" />
{:else}
	<img src="/marketing/{name}.webp" alt="" loading="lazy" decoding="async" class="shot {className}" />
{/if}

<style>
	.shot { display:block; max-width:none; border:1px solid var(--border); border-radius:14px; box-shadow:var(--shadow); background:var(--background); }
	.light { display:none; }
	:global(html.light) .dark { display:none; }
	:global(html.light) .light { display:block; }
</style>
