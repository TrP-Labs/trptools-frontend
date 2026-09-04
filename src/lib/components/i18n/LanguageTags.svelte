<script lang="ts">
	import { IconArrowLeft, IconPlus, IconX } from '@tabler/icons-svelte';
	import Flag from '$lib/components/ui/Flag.svelte';
	import LanguageMenu from './LanguageMenu.svelte';
	import { languageName } from '$lib/utils/languages';
	import { m } from '$lib/paraglide/messages.js';
	import type { Locale } from '$lib/paraglide/runtime.js';

	/**
	 * An ordered list of languages, as tags.
	 *
	 * Order is the whole point rather than a detail: the bot renders every
	 * message in each of these in turn, so the list is what decides whether an
	 * announcement reads "Upcoming shift / Наступна зміна" or the other way
	 * round — and the first is the one used alone in the two places Discord
	 * allows only one.
	 *
	 * Adding appends, which is the order somebody means when they add English
	 * and then Ukrainian. A tag can be moved one place earlier rather than
	 * only removed, because getting a two-item list the wrong way round
	 * otherwise means clearing it and starting again.
	 */
	interface Props {
		value: string[];
		max?: number;
		disabled?: boolean;
		onchange: (languages: string[]) => void;
	}

	let { value, max = 4, disabled = false, onchange }: Props = $props();

	let full = $derived(value.length >= max);

	function add(locale: Locale) {
		if (full || value.includes(locale)) return;
		onchange([...value, locale]);
	}

	function remove(locale: string) {
		// One language is the floor. An empty list would fall back to English
		// on the bot's side, which looks like the setting having been ignored.
		if (value.length <= 1) return;
		onchange(value.filter((entry) => entry !== locale));
	}

	function moveEarlier(index: number) {
		if (index <= 0) return;

		const next = [...value];
		[next[index - 1], next[index]] = [next[index], next[index - 1]];
		onchange(next);
	}
</script>

<div class="flex flex-wrap items-center gap-2">
	{#each value as locale, index (locale)}
		<span
			lang={locale}
			class="flex items-center gap-1.5 rounded-lg border border-border-base bg-background-muted
				py-1 pr-1 pl-2 text-sm text-text"
		>
			<Flag {locale} class="h-3.5 w-5 shrink-0 rounded-xs ring-1 ring-black/20" />
			<span class="max-w-32 truncate">{languageName(locale)}</span>

			{#if index === 0}
				<!--
					Named rather than left implicit: "first" is a position, and
					what it buys — leading every message, and being the one
					language a modal or a poll can carry — is not guessable
					from a list that merely happens to be in an order.
				-->
				<span class="rounded-md bg-accent/15 px-1.5 py-0.5 text-[11px] text-accent">
					{m.dashboard_bot_language_leads()}
				</span>
			{:else}
				<button
					type="button"
					{disabled}
					onclick={() => moveEarlier(index)}
					title={m.dashboard_bot_move_language_earlier({ language: languageName(locale) })}
					aria-label={m.dashboard_bot_move_language_earlier({ language: languageName(locale) })}
					class="grid size-5 place-items-center rounded-md text-text-subtle transition-colors
						hover:bg-background-raised hover:text-text disabled:opacity-50"
				>
					<IconArrowLeft size={13} />
				</button>
			{/if}

			{#if value.length > 1}
				<button
					type="button"
					{disabled}
					onclick={() => remove(locale)}
					title={m.dashboard_bot_remove_language({ language: languageName(locale) })}
					aria-label={m.dashboard_bot_remove_language({ language: languageName(locale) })}
					class="grid size-5 place-items-center rounded-md text-text-subtle transition-colors
						hover:bg-background-raised hover:text-danger disabled:opacity-50"
				>
					<IconX size={13} />
				</button>
			{/if}
		</span>
	{/each}

	{#if !full}
		<LanguageMenu
			taken={value}
			align="left"
			label={m.dashboard_bot_add_language()}
			emptyLabel={m.dashboard_bot_every_language_added()}
			onpick={add}
		>
			{#snippet trigger({ open, toggle })}
				<button
					type="button"
					{disabled}
					aria-haspopup="menu"
					aria-expanded={open}
					onclick={toggle}
					class="flex items-center gap-1.5 rounded-lg border border-dashed border-border-strong px-2
						py-1 text-sm text-text-muted transition-colors hover:border-accent hover:text-text
						disabled:opacity-50"
				>
					<IconPlus size={14} /> {m.dashboard_bot_add_language()}
				</button>
			{/snippet}
		</LanguageMenu>
	{/if}
</div>

{#if full}
	<p class="mt-2 text-xs text-text-subtle">{m.dashboard_bot_languages_at_most({ max })}</p>
{/if}
