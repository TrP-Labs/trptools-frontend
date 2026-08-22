<script lang="ts">
	import { refreshData } from '$lib/utils/refresh';
	import { IconPhotoPlus, IconTrash, IconAlertTriangle } from '@tabler/icons-svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import { API_URL, errorMessage } from '$lib/api/client';
	import { toasts } from '$lib/stores/toast.svelte';
	import type { MediaItem } from '$lib/api/types';

	interface Props {
		groupId: string;
		ownerType: 'GROUP' | 'ROUTE' | 'DEPOT';
		ownerId?: string;
		images: MediaItem[];
		label: string;
		hint?: string;
		onchange?: () => void;
	}

	let { groupId, ownerType, ownerId, images, label, hint, onchange }: Props = $props();

	let fileInput = $state<HTMLInputElement | null>(null);
	let uploading = $state(false);

	async function upload(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		const files = [...(input.files ?? [])];
		input.value = '';
		if (files.length === 0) return;

		uploading = true;

		for (const file of files) {
			const form = new FormData();
			form.set('file', file);
			form.set('groupId', groupId);
			form.set('ownerType', ownerType);
			if (ownerId) form.set('ownerId', ownerId);

			try {
				// Eden does not model multipart uploads, so this one call goes
				// through fetch directly.
				const response = await fetch(`${API_URL}/media`, {
					method: 'POST',
					body: form,
					credentials: 'include'
				});

				if (!response.ok) {
					const message = await response.text().catch(() => '');
					throw message || `Upload failed (${response.status})`;
				}
			} catch (error) {
				toasts.error(errorMessage(error, `Could not upload ${file.name}`));
			}
		}

		uploading = false;
		onchange?.();
		await refreshData();
	}

	async function remove(image: MediaItem) {
		if (!confirm('Delete this image?')) return;

		try {
			const response = await fetch(`${API_URL}/media/${image.id}`, {
				method: 'DELETE',
				credentials: 'include'
			});
			if (!response.ok) throw await response.text();

			toasts.success('Image deleted');
			onchange?.();
			await refreshData();
		} catch (error) {
			toasts.error(errorMessage(error, 'Could not delete that image'));
		}
	}
</script>

<div class="flex flex-col gap-2">
	<div class="flex items-center justify-between">
		<span class="text-xs font-semibold tracking-wide text-text-muted uppercase">{label}</span>
		<Button size="sm" variant="ghost" loading={uploading} onclick={() => fileInput?.click()}>
			<IconPhotoPlus size={15} /> Add images
		</Button>
	</div>

	{#if hint}
		<p class="text-xs text-text-subtle">{hint}</p>
	{/if}

	<input
		bind:this={fileInput}
		type="file"
		accept="image/png,image/jpeg,image/webp,image/gif"
		multiple
		class="hidden"
		onchange={upload}
	/>

	{#if images.length === 0}
		<p
			class="rounded-lg border border-dashed border-border-base px-3 py-6 text-center text-sm text-text-muted"
		>
			No images yet.
		</p>
	{:else}
		<ul class="grid grid-cols-2 gap-2 sm:grid-cols-4">
			{#each images as image (image.id)}
				<li class="group relative overflow-hidden rounded-lg border border-border-base">
					<img
						src={image.url}
						alt={image.caption || 'Uploaded image'}
						loading="lazy"
						decoding="async"
						class="aspect-video w-full bg-background-muted object-cover"
					/>

					<button
						type="button"
						onclick={() => remove(image)}
						aria-label="Delete image"
						class="absolute top-1.5 right-1.5 rounded-md bg-black/60 p-1.5 text-white opacity-0
							transition-opacity group-hover:opacity-100 focus-visible:opacity-100 hover:bg-danger"
					>
						<IconTrash size={14} />
					</button>

					{#if image.moderation === 'HIDDEN'}
						<p
							class="absolute inset-x-0 bottom-0 flex items-center gap-1 bg-danger/90 px-2 py-1 text-[0.65rem] text-white"
						>
							<IconAlertTriangle size={11} /> Hidden pending review
						</p>
					{/if}
				</li>
			{/each}
		</ul>
	{/if}
</div>
