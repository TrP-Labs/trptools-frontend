<script lang="ts">
	import { IconLanguage } from '@tabler/icons-svelte';
	import Flag from '$lib/components/ui/Flag.svelte';
	import LanguageMenu from './LanguageMenu.svelte';
	import { languageName, SITE_LOCALES } from '$lib/utils/languages';
	import type { Translations } from '$lib/utils/translations';
	import { m } from '$lib/paraglide/messages.js';

	/**
	 * A text box that edits one field in whichever language you point it at.
	 *
	 * The button on the right carries the flag of the language currently being
	 * typed. Switching it swaps what the box is bound to: the group's own
	 * source text, or its version in that language. A language with nothing
	 * written in it starts empty and shows the source text as a placeholder,
	 * so somebody translating can see what they are translating without
	 * leaving the field.
	 *
	 * The source text stays a plain string on the entity — it is what every
	 * reader falls back to and what the slug is derived from — and the other
	 * languages live in `translations`, which travels in the same PATCH. One
	 * save, or a translation could be written against a name that was not.
	 *
	 * A dot on the button means this field already has a version in some other
	 * language, which is the only way to tell from the outside; without it a
	 * translated form looks identical to an untranslated one.
	 */
	interface Props {
		/** The source text, in the group's own language. */
		value: string;
		/** Every language's version of every field on this row. */
		translations: Translations;
		/** Which field of the row this box is. */
		field: string;
		/** The language `value` is written in. */
		sourceLocale: string;
		multiline?: boolean;
		rows?: number;
		placeholder?: string;
		maxlength?: number;
		disabled?: boolean;
		id?: string;
		class?: string;
		/**
		 * Called when the box is left, for editors that save on blur rather
		 * than behind a button. Fires for a translation exactly as it does for
		 * the source text — the two travel in one request, so a form that only
		 * heard about one of them would drop the other.
		 */
		onblur?: () => void;
		/** Called on every keystroke, for an editor that tracks its own dirty flag. */
		oninput?: () => void;
	}

	let {
		value = $bindable(''),
		translations = $bindable({}),
		field,
		sourceLocale,
		multiline = false,
		rows = 3,
		placeholder = '',
		maxlength,
		disabled = false,
		id,
		class: className = '',
		onblur,
		oninput
	}: Props = $props();

	/**
	 * Which language the box is editing.
	 *
	 * Starts on the source, because writing the thing itself is what somebody
	 * is doing nine times out of ten and translating it is the deliberate act.
	 */
	// svelte-ignore state_referenced_locally
	let editing = $state(sourceLocale);

	let isSource = $derived(editing === sourceLocale);

	let current = $derived(isSource ? value : (translations?.[field]?.[editing] ?? ''));

	/** Languages this field already has a version in, for the ticks in the menu. */
	let written = $derived([
		sourceLocale,
		...Object.entries(translations?.[field] ?? {})
			.filter(([, text]) => text.trim().length > 0)
			.map(([locale]) => locale)
	]);

	/** Whether anything has been translated here at all. */
	let translated = $derived(written.length > 1);

	function write(next: string) {
		oninput?.();

		if (isSource) {
			value = next;
			return;
		}

		const forField = { ...(translations?.[field] ?? {}) };

		// A cleared box is "I have nothing for this", and the answer to that is
		// the source text — not a blank name on a public page.
		if (next.trim().length > 0) forField[editing] = next;
		else delete forField[editing];

		const next_ = { ...(translations ?? {}) };
		if (Object.keys(forField).length > 0) next_[field] = forField;
		else delete next_[field];

		translations = next_;
	}
</script>

<!--
	One box, not two.
	
	The flag used to be a separate bordered square beside the field, which read
	as a second control that happened to sit nearby rather than as something
	belonging to the text. The border, background and focus ring now live on
	this wrapper, the field inside it is transparent and borderless, and the
	button is divided off with a hairline — so the whole thing looks and
	focuses like the plain `Input` next to it on the same form.
-->
<div
	class="flex rounded-lg border border-border-base bg-background-secondary transition-colors
		focus-within:border-accent {multiline ? 'items-start' : 'items-stretch'}
		{disabled ? 'cursor-not-allowed opacity-60' : ''} {className}"
>
	{#if multiline}
		<textarea
			{id}
			{rows}
			{maxlength}
			{disabled}
			value={current}
			oninput={(event) => write(event.currentTarget.value)}
			onblur={() => onblur?.()}
			placeholder={isSource ? placeholder : value}
			lang={editing}
			class="min-w-0 flex-1 resize-y rounded-lg bg-transparent px-3 py-2 text-sm text-text
				placeholder:text-text-subtle focus:outline-none disabled:cursor-not-allowed"
		></textarea>
	{:else}
		<input
			{id}
			{maxlength}
			{disabled}
			value={current}
			oninput={(event) => write(event.currentTarget.value)}
			onblur={() => onblur?.()}
			placeholder={isSource ? placeholder : value}
			lang={editing}
			class="min-w-0 flex-1 rounded-lg bg-transparent px-3 py-2 text-sm text-text
				placeholder:text-text-subtle focus:outline-none disabled:cursor-not-allowed"
		/>
	{/if}

	<LanguageMenu
		current={editing}
		options={SITE_LOCALES}
		label={m.translate_language_for_this_box()}
		onpick={(locale) => (editing = locale)}
		class="self-stretch"
	>
		{#snippet trigger({ open, toggle })}
			<button
				type="button"
				{disabled}
				aria-haspopup="menu"
				aria-expanded={open}
				onclick={toggle}
				title={isSource
					? m.translate_writing_in_source({ language: languageName(editing) })
					: m.translate_writing_in({ language: languageName(editing) })}
				aria-label={m.translate_writing_in({ language: languageName(editing) })}
				class="relative grid h-full w-9 shrink-0 place-items-center rounded-r-lg border-l
					border-border-base transition-colors disabled:cursor-not-allowed
					{multiline ? 'py-2.5' : ''}
					{isSource
					? 'text-text-subtle hover:bg-background-muted hover:text-text'
					: 'bg-accent/10 text-accent hover:bg-accent/15'}"
			>
				<Flag locale={editing} class="h-3.5 w-5 rounded-xs ring-1 ring-black/20" />

				{#if translated}
					<!--
						The only outward sign that this field has been
						translated at all. Without it a form somebody has
						filled in four languages looks exactly like one nobody
						has touched. Inside the box now, so it sits on the
						divider rather than poking out of the top corner.
					-->
					<span
						class="absolute top-1.5 right-1.5 size-1.5 rounded-full bg-accent"
						class:top-2={multiline}
					></span>
				{/if}
			</button>
		{/snippet}
	</LanguageMenu>
</div>

{#if !isSource}
	<p class="mt-1.5 flex items-center gap-1.5 text-xs text-text-subtle">
		<IconLanguage size={13} class="shrink-0" />
		{m.translate_blank_falls_back_to({ language: languageName(sourceLocale) })}
	</p>
{/if}
