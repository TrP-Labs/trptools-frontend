<script lang="ts">
	import type { Snippet } from 'svelte';
	import { IconX } from '@tabler/icons-svelte';
	import { m } from '$lib/paraglide/messages.js';

	interface Props {
		open: boolean;
		title: string;
		description?: string;
		size?: 'sm' | 'md' | 'lg';
		onclose?: () => void;
		footer?: Snippet;
		children: Snippet;
	}

	let {
		open = $bindable(false),
		title,
		description,
		size = 'md',
		onclose,
		footer,
		children
	}: Props = $props();

	let dialog = $state<HTMLDialogElement | null>(null);

	const widths = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-3xl' };

	// <dialog> owns focus trapping, inertness and Esc for free, so the open
	// state is mirrored onto it rather than reimplemented.
	$effect(() => {
		if (!dialog) return;
		if (open && !dialog.open) dialog.showModal();
		else if (!open && dialog.open) dialog.close();
	});

	function close() {
		open = false;
		onclose?.();
	}
</script>

<dialog
	bind:this={dialog}
	onclose={close}
	onclick={(event) => {
		// Clicking the backdrop lands on the dialog element itself.
		if (event.target === dialog) close();
	}}
	class="m-auto w-[calc(100%-2rem)] {widths[size]} rounded-xl border border-border-base bg-surface p-0
		text-text shadow-2xl backdrop:bg-black/60 backdrop:backdrop-blur-sm"
>
	<div class="flex items-start justify-between gap-4 border-b border-border-base px-5 py-4">
		<div class="min-w-0">
			<h2 class="text-base font-semibold">{title}</h2>
			{#if description}
				<p class="mt-1 text-sm text-text-muted">{description}</p>
			{/if}
		</div>

		<button
			type="button"
			onclick={close}
			aria-label={m.ui_modal_close()}
			class="-m-1 rounded-lg p-1 text-text-muted transition-colors hover:bg-background-muted hover:text-text"
		>
			<IconX size={18} />
		</button>
	</div>

	<div class="max-h-[70vh] overflow-y-auto px-5 py-4">
		{@render children()}
	</div>

	{#if footer}
		<div
			class="flex flex-wrap justify-end gap-2 border-t border-border-base bg-background-secondary px-5 py-3"
		>
			{@render footer()}
		</div>
	{/if}
</dialog>
