<script lang="ts">
	import { IconFlag, IconLink } from '@tabler/icons-svelte';
	import OverflowMenu from '$lib/components/ui/OverflowMenu.svelte';
	import MenuItem from '$lib/components/ui/MenuItem.svelte';
	import { reportDialog } from '$lib/stores/report.svelte';
	import { toasts } from '$lib/stores/toast.svelte';
	import type { MediaItem } from '$lib/api/types';
	import { m } from '$lib/paraglide/messages.js';
	import { localized } from '$lib/utils/translations';

	interface Props {
		images: MediaItem[];
		/** A grid reads better on a page devoted to one route or depot. */
		layout?: 'strip' | 'grid';
	}

	let { images, layout = 'strip' }: Props = $props();

	let lightbox = $state<MediaItem | null>(null);

	async function copyLink(image: MediaItem) {
		try {
			await navigator.clipboard.writeText(image.url);
			toasts.success(m.media_image_gallery_image_link_copied());
		} catch {
			toasts.error(m.media_image_gallery_could_not_copy_link());
		}
	}
</script>

<ul
	class={layout === 'grid'
		? 'grid grid-cols-1 gap-3 sm:grid-cols-2'
		: 'flex gap-2 overflow-x-auto border-t border-border-base p-3'}
>
	{#each images as image (image.id)}
		<li class="group relative {layout === 'grid' ? '' : 'shrink-0'}">
			<button
				type="button"
				onclick={() => (lightbox = image)}
				class="block w-full overflow-hidden rounded-lg border border-border-base"
			>
				<img
					src={image.url}
					alt={localized(image, 'caption') || 'Group image'}
					loading="lazy"
					decoding="async"
					class="bg-background-muted object-cover transition-transform group-hover:scale-105
						{layout === 'grid' ? 'aspect-video w-full' : 'h-28 w-44'}"
				/>
			</button>

			<div
				class="absolute top-1 right-1 rounded-md bg-black/50 opacity-0 transition-opacity
					group-hover:opacity-100 focus-within:opacity-100"
			>
				<OverflowMenu label={m.media_image_gallery_image_actions()}>
					{#snippet children(close)}
						<MenuItem
							onclick={() => {
								close();
								copyLink(image);
							}}
						>
							<IconLink size={15} /> {m.media_image_gallery_copy_image_link()}
						</MenuItem>
						<MenuItem
							tone="danger"
							onclick={() => {
								close();
								reportDialog.open({
									targetType: 'MEDIA',
									targetId: image.id,
									label: 'this image'
								});
							}}
						>
							<IconFlag size={15} /> {m.media_image_gallery_report_image()}
						</MenuItem>
					{/snippet}
				</OverflowMenu>
			</div>

			{#if localized(image, 'caption')}
				<p class="mt-1 truncate text-xs text-text-subtle {layout === 'grid' ? '' : 'w-44'}">
					{localized(image, 'caption')}
				</p>
			{/if}
		</li>
	{/each}
</ul>

{#if lightbox}
	<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
		onclick={() => (lightbox = null)}
	>
		<figure class="max-h-full max-w-4xl">
			<img
				src={lightbox.url}
				alt={localized(lightbox, 'caption') || 'Group image'}
				class="max-h-[80vh] w-auto rounded-lg object-contain"
			/>
			{#if localized(lightbox, 'caption')}
				<figcaption class="mt-2 text-center text-sm text-white/80">{localized(lightbox, 'caption')}</figcaption>
			{/if}
		</figure>

		<button
			type="button"
			class="absolute top-4 right-4 rounded-lg bg-white/10 px-3 py-1.5 text-sm text-white hover:bg-white/20"
			onclick={() => (lightbox = null)}
		>
			{m.media_image_gallery_close()}
		</button>
	</div>
{/if}
