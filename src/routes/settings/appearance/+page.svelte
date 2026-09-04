<script lang="ts">
	import { IconCheck } from '@tabler/icons-svelte';
	import PageHeader from '$lib/components/ui/PageHeader.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import { api } from '$lib/api/client';
	import { toasts } from '$lib/stores/toast.svelte';
	import type { PageProps } from './$types';
	import { m } from '$lib/paraglide/messages.js';
	import { getLocale, locales, setLocale, type Locale } from '$lib/paraglide/runtime.js';

	let { data }: PageProps = $props();

	const themes = [
		{ value: 'dim', label: m.settings_appearance_dim(), hint: m.settings_appearance_soft_dark_grey(), swatches: ['#1d1d1d', '#313131', '#5b9dff'] },
		{ value: 'midnight', label: m.settings_appearance_midnight(), hint: m.settings_appearance_near_black(), swatches: ['#0a0a0a', '#121212', '#5b9dff'] },
		{ value: 'light', label: m.settings_appearance_light(), hint: m.settings_appearance_bright(), swatches: ['#f2f3f5', '#ffffff', '#2563eb'] }
	] as const;

	/**
	 * What each shipped language calls itself.
	 *
	 * Endonyms, and deliberately not run through the message files: a reader
	 * looking for their own language needs to recognise it while the interface
	 * is still in one they cannot read.
	 */
	const LANGUAGE_NAMES: Record<string, string> = {
		en: 'English',
		cs: 'Čeština',
		de: 'Deutsch',
		pl: 'Polski',
		ru: 'Русский',
		uk: 'Українська'
	};

	// Seeded from the server-rendered theme, then owned by this component.
	// svelte-ignore state_referenced_locally
	let current = $state(data.theme ?? 'dim');

	// svelte-ignore state_referenced_locally
	let language = $state<Locale>(data.locale ?? getLocale());

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
			toasts.error(m.settings_appearance_saved_device_but_could_not_sync());
		}
	}

	async function pickLanguage(locale: Locale) {
		if (locale === language) return;
		language = locale;

		// Sync to the account first. `setLocale` reloads the document so the
		// whole page comes back translated, and anything left running after it
		// is not guaranteed to finish.
		try {
			await api.users.me.preferences.patch({ locale });
		} catch {
			toasts.error(m.settings_appearance_saved_device_but_could_not_sync());
		}

		setLocale(locale);
	}
</script>

<PageHeader title={m.settings_appearance_appearance()} description={m.settings_appearance_how_trp_tools_looks_account()} />

<Card title={m.settings_appearance_theme()}>
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

<Card title={m.settings_appearance_language()} description={m.settings_appearance_language_description()} class="mt-6">
	<div class="grid gap-3 sm:grid-cols-3">
		{#each locales as locale (locale)}
			{@const active = language === locale}
			<button
				type="button"
				onclick={() => pickLanguage(locale)}
				aria-pressed={active}
				lang={locale}
				class="flex items-center justify-between gap-2 rounded-xl border p-4 text-left transition-colors
					{active ? 'border-accent bg-accent/10' : 'border-border-base hover:border-border-strong'}"
			>
				<span class="text-sm font-medium text-text">{LANGUAGE_NAMES[locale] ?? locale}</span>
				{#if active}<IconCheck size={15} class="text-accent" />{/if}
			</button>
		{/each}
	</div>
</Card>
