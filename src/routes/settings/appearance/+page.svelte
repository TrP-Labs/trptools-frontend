<script lang="ts">
	import { IconCheck, IconWorld } from '@tabler/icons-svelte';
	import PageHeader from '$lib/components/ui/PageHeader.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Flag from '$lib/components/ui/Flag.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import { api } from '$lib/api/client';
	import { refreshData } from '$lib/utils/refresh';
	import { toasts } from '$lib/stores/toast.svelte';
	import { detectTimezone, isValidTimezone } from '$lib/utils/format';
	import type { PageProps } from './$types';
	import { m } from '$lib/paraglide/messages.js';
	import { getLocale, setLocale, type Locale } from '$lib/paraglide/runtime.js';
	import { isPartlyTranslated, languageName, SITE_LOCALES } from '$lib/utils/languages';

	let { data }: PageProps = $props();

	/**
	 * Every setting on this page lives in a cookie, which is why it opens to
	 * everybody. The account is where the choice is *kept* — so signed out
	 * every write below stops at the cookie and the PATCH is not attempted,
	 * rather than fired and refused.
	 */
	let signedIn = $derived(Boolean(data.user));

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

		// The cookie above is the whole of it without an account.
		if (!signedIn) return;

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
		if (signedIn) {
			try {
				await api.users.me.preferences.patch({ locale: choice === 'auto' ? null : choice });
			} catch {
				toasts.error(m.settings_appearance_saved_device_but_could_not_sync());
			}
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

	/**
	 * The zone dates are drawn in.
	 *
	 * It sits here rather than on the account page because it is the same kind
	 * of setting as the two above — how TrP Tools is shown to whoever is
	 * reading it — and because it means something before anybody signs in. A
	 * shift page tells a visitor when the shift starts, and the answer has to
	 * be in their own time.
	 */
	// svelte-ignore state_referenced_locally
	let timezone = $state(data.timezone ?? detectTimezone());

	/** Whether anything has been chosen, or the browser's answer stands. */
	let chosen = $derived(Boolean(data.timezone));

	let savingZone = $state(false);

	/**
	 * The zones this runtime knows, offered as completions rather than as a
	 * closed list: the box still accepts anything, and Save is what refuses a
	 * name no date could be drawn in.
	 */
	const zones =
		typeof Intl.supportedValuesOf === 'function' ? Intl.supportedValuesOf('timeZone') : [];

	let zoneUsable = $derived(isValidTimezone(timezone));

	async function saveTimezone() {
		savingZone = true;
		try {
			// The cookie is what the server render reads, so it goes first and
			// is the whole of it without an account.
			document.cookie = `timezone=${encodeURIComponent(timezone)}; path=/; max-age=31536000; samesite=lax`;

			if (signedIn) {
				try {
					await api.users.me.preferences.patch({ timezone });
				} catch {
					toasts.error(m.settings_appearance_saved_device_but_could_not_sync());
				}
			}

			toasts.success(m.settings_settings_saved());

			// Every date already on screen was drawn in the old zone, and the
			// new one is only knowable to the server through the cookie above.
			await refreshData();
		} finally {
			savingZone = false;
		}
	}
</script>

<PageHeader
	title={m.settings_appearance_appearance()}
	description={signedIn
		? m.settings_appearance_how_trp_tools_looks_account()
		: m.settings_appearance_how_trp_tools_looks_device()}
/>

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
				class="flex items-center gap-2.5 rounded-xl border p-4 text-left transition-colors
					{active ? 'border-accent bg-accent/10' : 'border-border-base hover:border-border-strong'}"
			>
				<Flag {locale} class="h-5 w-7 shrink-0 rounded-sm ring-1 ring-black/20" />
				<!--
					`lang` marks the endonym alone, not the whole button. The note
					below it is written in the reader's language, not in the one
					being offered, and tagging both would have a screen reader
					pronounce "Partly translated" as though it were German.
				-->
				<span class="min-w-0 flex-1">
					<span class="flex items-center gap-1.5 text-sm font-medium text-text">
						<span class="truncate" lang={locale}>{languageName(locale)}</span>
						{#if active}<IconCheck size={15} class="shrink-0 text-accent" />{/if}
					</span>
					{#if isPartlyTranslated(locale)}
						<span class="block truncate text-xs text-warning">
							{m.settings_appearance_partly_translated()}
						</span>
					{/if}
				</span>
			</button>
		{/each}
	</div>
</Card>

<Card title={m.settings_time_zone()} description={m.settings_shift_times_are_shown_zone()} class="mt-6">
	{#snippet actions()}
		<Button onclick={saveTimezone} loading={savingZone} disabled={!zoneUsable}>
			{m.common_save()}
		</Button>
	{/snippet}

	<div class="flex flex-wrap gap-2">
		<Input
			bind:value={timezone}
			list="timezones"
			spellcheck="false"
			maxlength={64}
			class="min-w-48 flex-1"
		/>
		<Button variant="secondary" onclick={() => (timezone = detectTimezone())}>
			{m.settings_detect()}
		</Button>
	</div>

	<datalist id="timezones">
		{#each zones as zone (zone)}
			<option value={zone}></option>
		{/each}
	</datalist>

	<!--
		Only said to somebody who has an account to keep it on. Signed out the
		note at the foot of the page already says the same thing about all
		three settings, and saying it twice invites the reader to look for two
		different meanings.
	-->
	{#if signedIn && !chosen}
		<p class="mt-2 text-xs text-text-subtle">{m.settings_time_zone_from_this_device()}</p>
	{/if}
</Card>

{#if !signedIn}
	<!--
		Said after the choice rather than before it: nothing here is refused
		without an account, it simply does not travel. Somebody who only ever
		uses this browser never needs to act on it.
	-->
	<p class="mt-6 text-sm text-text-muted">
		{m.settings_appearance_sign_in_to_keep()}
	</p>
{/if}
