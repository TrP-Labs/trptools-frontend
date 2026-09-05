<script lang="ts">
	import { IconCheck, IconWorld } from '@tabler/icons-svelte';
	import PageHeader from '$lib/components/ui/PageHeader.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import Flag from '$lib/components/ui/Flag.svelte';
	import { api } from '$lib/api/client';
	import { toasts } from '$lib/stores/toast.svelte';
	import type { PageProps } from './$types';
	import { m } from '$lib/paraglide/messages.js';
	import { getLocale, setLocale, type Locale } from '$lib/paraglide/runtime.js';
	import { languageName, SITE_LOCALES } from '$lib/utils/languages';

	let { data }: PageProps = $props();

	const themes = [
		{ value: 'dim', label: m.settings_appearance_dim(), hint: m.settings_appearance_soft_dark_gray(), swatches: ['#1d1d1d', '#313131', '#5b9dff'] },
		{ value: 'midnight', label: m.settings_appearance_midnight(), hint: m.settings_appearance_near_black(), swatches: ['#0a0a0a', '#121212', '#5b9dff'] },
		{ value: 'light', label: m.settings_appearance_light(), hint: m.settings_appearance_bright(), swatches: ['#f2f3f5', '#ffffff', '#2563eb'] }
	] as const;

	// Seeded from the server-rendered theme, then owned by this component.
	// svelte-ignore state_referenced_locally
	let current = $state(data.theme ?? 'dim');

	/**
	 * The selection, which is not the same thing as the language being shown.
	 *
	 * Automatic and an explicit English both render in English, so the resolved
	 * locale cannot tell them apart — `localeSource` from the server can, and is
	 * the only thing that knows whether a cookie or an account preference put us
	 * here rather than the browser's own header.
	 */
	// svelte-ignore state_referenced_locally
	let language = $state<Locale | 'auto'>(
		data.localeSource === 'automatic' ? 'auto' : (data.locale ?? getLocale())
	);

	/** What Automatic currently works out to, so the choice is not a guess. */
	let resolved = $derived(data.locale ?? getLocale());

	let isAuto = $derived(language === 'auto');

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

	async function pickLanguage(choice: Locale | 'auto') {
		if (choice === language) return;
		language = choice;

		// Sync to the account first. Both branches below end the document, and
		// anything still in flight when they do is not guaranteed to finish.
		try {
			await api.users.me.preferences.patch({ locale: choice === 'auto' ? null : choice });
		} catch {
			toasts.error(m.settings_appearance_saved_device_but_could_not_sync());
		}

		if (choice === 'auto') {
			// `setLocale` cannot express "no preference" — its cookie branch only
			// ever assigns one — so the cookie is cleared by hand and the
			// document reloaded to let `Accept-Language` decide. Not `setLocale`
			// even as a follow-up: its reload is gated on the locale actually
			// changing, so it would quietly do nothing whenever the browser
			// already asks for the language that was just switched away from.
			document.cookie = 'locale=; path=/; max-age=0; samesite=lax';
			location.reload();
			return;
		}

		setLocale(choice);
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
		<!--
			Automatic first, because it is the default and because a reader who
			does not find their language wants the fallback to be the obvious
			thing on the list rather than the last.
		-->
		<button
			type="button"
			onclick={() => pickLanguage('auto')}
			aria-pressed={isAuto}
			class="flex items-center gap-2.5 rounded-xl border p-4 text-left transition-colors
				{isAuto ? 'border-accent bg-accent/10' : 'border-border-base hover:border-border-strong'}"
		>
			<IconWorld size={20} class="shrink-0 text-text-muted" />
			<span class="min-w-0 flex-1">
				<span class="flex items-center gap-1.5 text-sm font-medium text-text">
					{m.settings_appearance_automatic()}
					{#if isAuto}<IconCheck size={15} class="text-accent" />{/if}
				</span>
				<span class="block truncate text-xs text-text-muted">
					{isAuto
						? languageName(resolved)
						: m.settings_appearance_follows_browser_language()}
				</span>
			</span>
		</button>

		{#each SITE_LOCALES as locale (locale)}
			{@const active = language === locale}
			<button
				type="button"
				onclick={() => pickLanguage(locale)}
				aria-pressed={active}
				lang={locale}
				class="flex items-center gap-2.5 rounded-xl border p-4 text-left transition-colors
					{active ? 'border-accent bg-accent/10' : 'border-border-base hover:border-border-strong'}"
			>
				<Flag {locale} class="h-5 w-7 shrink-0 rounded-sm ring-1 ring-black/20" />
				<span class="flex min-w-0 flex-1 items-center gap-1.5 text-sm font-medium text-text">
					<span class="truncate">{languageName(locale)}</span>
					{#if active}<IconCheck size={15} class="shrink-0 text-accent" />{/if}
				</span>
			</button>
		{/each}
	</div>
</Card>
