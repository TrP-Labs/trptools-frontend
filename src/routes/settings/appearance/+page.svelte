<script lang="ts">
	import { IconCheck } from '@tabler/icons-svelte';
	import PageHeader from '$lib/components/ui/PageHeader.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import { api } from '$lib/api/client';
	import { toasts } from '$lib/stores/toast.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const themes = [
		{ value: 'dim', label: 'Dim', hint: 'Soft dark grey', swatches: ['#1d1d1d', '#313131', '#5b9dff'] },
		{ value: 'midnight', label: 'Midnight', hint: 'Near black', swatches: ['#0a0a0a', '#121212', '#5b9dff'] },
		{ value: 'light', label: 'Light', hint: 'Bright', swatches: ['#f2f3f5', '#ffffff', '#2563eb'] }
	] as const;

	// Seeded from the server-rendered theme, then owned by this component.
	// svelte-ignore state_referenced_locally
	let current = $state(data.theme ?? 'dim');

	async function pick(theme: 'dim' | 'midnight' | 'light') {
		current = theme;

		// Apply immediately, then persist. The cookie is what keeps the choice
		// through a server render, so there is no flash on the next load.
		document.documentElement.classList.remove('dim', 'midnight', 'light');
		document.documentElement.classList.add(theme);
		document.cookie = `theme=${theme}; path=/; max-age=31536000; samesite=lax`;

		try {
			await api.users.me.preferences.patch({ theme });
		} catch {
			toasts.error('Saved on this device, but could not sync to your account');
		}
	}
</script>

<PageHeader title="Appearance" description="How TrP Tools looks on this account." />

<Card title="Theme">
	<div class="grid gap-3 sm:grid-cols-3">
		{#each themes as theme (theme.value)}
			{@const active = current === theme.value}
			<button
				type="button"
				onclick={() => pick(theme.value)}
				aria-pressed={active}
				class="rounded-xl border p-4 text-left transition-colors
					{active ? 'border-accent bg-accent/10' : 'border-border-base hover:border-border-strong'}"
			>
				<div class="mb-3 flex gap-1.5">
					{#each theme.swatches as swatch (swatch)}
						<span
							class="size-6 rounded-md border border-black/20"
							style="background: {swatch}"
						></span>
					{/each}
				</div>

				<p class="flex items-center gap-1.5 text-sm font-medium text-text">
					{theme.label}
					{#if active}<IconCheck size={15} class="text-accent" />{/if}
				</p>
				<p class="text-xs text-text-muted">{theme.hint}</p>
			</button>
		{/each}
	</div>
</Card>
