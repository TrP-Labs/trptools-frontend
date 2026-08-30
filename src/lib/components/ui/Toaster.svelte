<script lang="ts">
	import { fly } from 'svelte/transition';
	import { IconAlertTriangle, IconCheck, IconInfoCircle, IconX } from '@tabler/icons-svelte';
	import { toasts } from '$lib/stores/toast.svelte';
	import { m } from '$lib/paraglide/messages.js';

	const tones = {
		success: 'border-success/40 text-success',
		error: 'border-danger/40 text-danger',
		info: 'border-accent/40 text-accent'
	};
</script>

<div
	class="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex flex-col items-center gap-2 p-4 sm:inset-x-auto sm:right-0 sm:items-end"
	aria-live="polite"
>
	{#each toasts.items as toast (toast.id)}
		<div
			transition:fly={{ y: 12, duration: 180 }}
			class="pointer-events-auto flex w-full max-w-sm items-start gap-2.5 rounded-xl border bg-surface px-3.5 py-3 shadow-lg {tones[
				toast.kind
			]}"
		>
			<span class="mt-0.5 shrink-0">
				{#if toast.kind === 'success'}
					<IconCheck size={17} />
				{:else if toast.kind === 'error'}
					<IconAlertTriangle size={17} />
				{:else}
					<IconInfoCircle size={17} />
				{/if}
			</span>

			<p class="min-w-0 flex-1 text-sm break-words text-text">{toast.message}</p>

			<button
				type="button"
				aria-label={m.ui_toaster_dismiss()}
				onclick={() => toasts.dismiss(toast.id)}
				class="-m-1 shrink-0 rounded p-1 text-text-subtle transition-colors hover:text-text"
			>
				<IconX size={15} />
			</button>
		</div>
	{/each}
</div>
