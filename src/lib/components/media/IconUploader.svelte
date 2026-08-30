<script lang="ts">
	import { refreshData } from '$lib/utils/refresh';
	import { IconPhotoPlus, IconTrash } from '@tabler/icons-svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import { API_URL, errorMessage } from '$lib/api/client';
	import { toasts } from '$lib/stores/toast.svelte';
	import type { Snippet } from 'svelte';
	import { m } from '$lib/paraglide/messages.js';

	interface Props {
		groupId: string;
		ownerType: 'GROUP' | 'ROUTE' | 'DEPOT';
		ownerId?: string;
		/** The image in place right now, if any. */
		current: string | null;
		label: string;
		hint?: string;
		/** How the preview is framed: a square badge or a wide banner. */
		aspect?: 'square' | 'wide';
		/** Shown when nothing is uploaded, so the default is visible in context. */
		placeholder?: Snippet;
	}

	let {
		groupId,
		ownerType,
		ownerId,
		current,
		label,
		hint,
		aspect = 'square',
		placeholder
	}: Props = $props();

	let fileInput = $state<HTMLInputElement | null>(null);
	let busy = $state(false);

	/**
	 * Upload and linkage happen in one request. Uploading first and pointing the
	 * route at it afterwards would leave an orphaned image behind whenever the
	 * second call failed.
	 */
	async function upload(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		input.value = '';
		if (!file) return;

		const form = new FormData();
		form.set('file', file);
		form.set('groupId', groupId);
		form.set('ownerType', ownerType);
		if (ownerId) form.set('ownerId', ownerId);

		busy = true;
		try {
			// Eden does not model multipart uploads, so this goes through fetch.
			const response = await fetch(`${API_URL}/media/icon`, {
				method: 'PUT',
				body: form,
				credentials: 'include'
			});

			if (!response.ok)
				throw (
					(await response.text().catch(() => '')) ||
					m.media_upload_failed({ status: response.status })
				);

			toasts.success(m.media_icon_uploader_updated({ label }));
			await refreshData();
		} catch (error) {
			toasts.error(errorMessage(error, m.media_icon_uploader_could_not_upload({ label: label.toLowerCase() })));
		} finally {
			busy = false;
		}
	}

	async function clear() {
		busy = true;
		try {
			const params = new URLSearchParams({ groupId, ownerType });
			if (ownerId) params.set('ownerId', ownerId);

			const response = await fetch(`${API_URL}/media/icon?${params}`, {
				method: 'DELETE',
				credentials: 'include'
			});

			if (!response.ok) throw await response.text();

			toasts.success(m.media_icon_uploader_removed({ label }));
			await refreshData();
		} catch (error) {
			toasts.error(errorMessage(error, m.media_icon_uploader_could_not_remove_image()));
		} finally {
			busy = false;
		}
	}
</script>

<div class="flex flex-col gap-2">
	<span class="text-xs font-semibold tracking-wide text-text-muted uppercase">{label}</span>

	{#if hint}
		<p class="text-xs text-text-subtle">{hint}</p>
	{/if}

	<input
		bind:this={fileInput}
		type="file"
		accept="image/png,image/jpeg,image/webp,image/gif"
		class="hidden"
		onchange={upload}
	/>

	<div class="flex flex-wrap items-center gap-3">
		<div
			class="grid shrink-0 place-items-center overflow-hidden rounded-lg border border-border-base bg-background-muted
				{aspect === 'wide' ? 'h-20 w-48' : 'size-20'}"
		>
			{#if current}
				<img src={current} alt={label} class="h-full w-full object-contain" />
			{:else if placeholder}
				{@render placeholder()}
			{:else}
				<span class="text-xs text-text-subtle">{m.media_icon_uploader_none()}</span>
			{/if}
		</div>

		<div class="flex flex-wrap gap-2">
			<Button size="sm" variant="secondary" loading={busy} onclick={() => fileInput?.click()}>
				<IconPhotoPlus size={15} />
				{current ? m.media_icon_uploader_replace() : m.media_icon_uploader_upload()}
			</Button>

			{#if current}
				<Button size="sm" variant="ghost" disabled={busy} onclick={clear}>
					<IconTrash size={15} /> {m.media_icon_uploader_remove()}
				</Button>
			{/if}
		</div>
	</div>
</div>
