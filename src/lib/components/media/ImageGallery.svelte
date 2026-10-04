<script lang="ts">
	import { IconFlag, IconLink } from '@tabler/icons-svelte';
	import OverflowMenu from '$lib/components/ui/OverflowMenu.svelte';
	import Modal from '$lib/components/ui/Modal.svelte';
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
		<li class="group relative min-w-0 {layout === 'grid' ? '' : 'shrink-0'}">
			<button
				type="button"
				onclick={() => (lightbox = image)}
				class="block w-full overflow-hidden rounded-lg border border-border-base"
			>
				<img
					src={image.url}
					alt={localized(image, 'caption') || m.media_image_manager_uploaded_image()}
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
									label: localized(image, 'caption') || m.media_image_manager_uploaded_image()
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
	<Modal open={true} title={localized(lightbox, 'caption') || m.media_image_gallery_image_actions()} size="lg" onclose={() => (lightbox = null)}>
		<figure class="max-h-full max-w-4xl">
			<img
				src={lightbox.url}
				alt={localized(lightbox, 'caption') || m.media_image_manager_uploaded_image()}
				class="max-h-[80vh] w-auto rounded-lg object-contain"
			/>
			{#if localized(lightbox, 'caption')}
				<figcaption class="mt-2 text-center text-sm text-text-muted">{localized(lightbox, 'caption')}</figcaption>
			{/if}
		</figure>

	</Modal>
{/if}
