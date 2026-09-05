<script lang="ts">
	import { IconCheck } from '@tabler/icons-svelte';
	import type { Snippet } from 'svelte';
	import Flag from '$lib/components/ui/Flag.svelte';
	import { languageName, SITE_LOCALES } from '$lib/utils/languages';
	import type { Locale } from '$lib/paraglide/runtime.js';

	/**
	 * A list of languages to pick one from, drawn as a popover.
	 *
	 * A popover rather than a `<dialog>`, and one instance per trigger rather
	 * than a shared one: a settings page carries one of these beside every
	 * translatable text box, and `backdrop-blur` on dozens of dialogs is
	 * exactly the waste trap 11 is about.
	 *
	 * Not `ui/CustomSelect` either, though both draw an option list. That one
	 * is a listbox over one value with typeahead and `aria-activedescendant`,
	 * built to keep focus on the dispatch board's keyboard cursor. This is a
	 * menu of actions — "switch what I am editing", "add another language" —
	 * where following the pick with focus is the right behaviour rather than
	 * the wrong one.
	 *
	 * The flags are decoration and are `aria-hidden` inside `Flag`; the
	 * endonym is the label, because somebody looking for their own language
	 * reads the name and a flag is not a language.
	 */
	interface Props {
		/** Which language the trigger currently stands for, if any. */
		current?: string | null;
		/** Languages to offer. Defaults to every one the site ships. */
		options?: readonly string[];
		/** Languages already spoken for, shown ticked and refused a second time. */
		taken?: readonly string[];
		/** What to show when every option is taken. */
		emptyLabel?: string;
		label: string;
		onpick: (locale: Locale) => void;
		/** The button that opens the menu. Given the open state and a toggle. */
		trigger: Snippet<[{ open: boolean; toggle: (event: MouseEvent) => void }]>;
		align?: 'left' | 'right';
		class?: string;
	}

	let {
		current = null,
		options = SITE_LOCALES,
		taken = [],
		emptyLabel = '',
		label,
		onpick,
		trigger,
		align = 'right',
		class: className = ''
	}: Props = $props();

	let open = $state(false);
	let root = $state<HTMLDivElement | null>(null);

	let choices = $derived(options.filter((locale) => !taken.includes(locale) || locale === current));

	function toggle(event: MouseEvent) {
		// These sit inside cards that are sometimes links, and inside forms.
		event.preventDefault();
		event.stopPropagation();
		open = !open;
	}

	function onWindowPointerDown(event: PointerEvent) {
		if (open && root && !root.contains(event.target as Node)) open = false;
	}

	function onWindowKeydown(event: KeyboardEvent) {
		if (open && event.key === 'Escape') {
			event.stopPropagation();
			open = false;
		}
	}
</script>

<svelte:window onpointerdown={onWindowPointerDown} onkeydown={onWindowKeydown} />

<div bind:this={root} class="relative shrink-0 {className}">
	{@render trigger({ open, toggle })}

	{#if open}
		<div
			role="menu"
			aria-label={label}
			class="absolute z-30 mt-1 max-h-72 w-52 overflow-y-auto rounded-xl border border-border-base
				bg-background-raised p-1 shadow-lg {align === 'right' ? 'right-0' : 'left-0'}"
		>
			{#each choices as locale (locale)}
				<button
					type="button"
					role="menuitem"
					lang={locale}
					onclick={(event) => {
						event.preventDefault();
						event.stopPropagation();
						open = false;
						onpick(locale as Locale);
					}}
					class="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm
						transition-colors hover:bg-background-muted
						{locale === current ? 'text-text' : 'text-text-muted'}"
				>
					<Flag {locale} class="h-3.5 w-5 shrink-0 rounded-xs ring-1 ring-black/20" />
					<span class="min-w-0 flex-1 truncate">{languageName(locale)}</span>
					{#if locale === current}
						<IconCheck size={14} class="shrink-0 text-accent" />
					{/if}
				</button>
			{:else}
				<p class="px-2 py-1.5 text-sm text-text-subtle">{emptyLabel}</p>
			{/each}
		</div>
	{/if}
</div>
