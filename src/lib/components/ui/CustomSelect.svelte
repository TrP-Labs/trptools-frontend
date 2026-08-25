<script lang="ts" generics="T extends string">
	/**
	 * A listbox that behaves like a native select.
	 *
	 * A native `<select>` cannot draw a route's colour, a glowing dot or a
	 * two-line option, which the dispatch board needs. What it *can* do is
	 * behave correctly with a keyboard, and that is the part usually lost when
	 * a select is rebuilt — so the behaviours people already have in their
	 * fingers are reimplemented here deliberately:
	 *
	 * - Enter, Space, Alt+Down or either arrow opens it.
	 * - Arrows, Home and End move the highlight; Enter or Space commits.
	 * - Typing jumps to the option that starts with what you typed, whether or
	 *   not the list is open, and repeating one letter cycles through matches.
	 * - Escape closes without changing anything; Tab closes and moves on.
	 *
	 * Focus stays on the trigger the whole time and the highlight travels as
	 * `aria-activedescendant`. That is what screen readers expect from a
	 * combobox, and it also means the dispatch page's keyboard cursor — which
	 * moves real focus between controls — never has focus pulled out from
	 * under it by a popup opening.
	 */
	import { tick } from 'svelte';

	interface Option {
		value: T;
		label: string;
		disabled?: boolean;
		/** Painted as a swatch beside the label — a route's own colour. */
		color?: string | null;
		/** A glowing dot instead of a swatch, for options that are not routes. */
		dot?: 'note' | null;
		/** Secondary text, shown dimmed after the label. */
		hint?: string;
	}

	interface Props {
		value: T;
		options: Option[];
		id?: string;
		disabled?: boolean;
		/** Shown when the value matches no option. */
		placeholder?: string;
		ariaLabel?: string;
		invalid?: boolean;
		title?: string;
		size?: 'sm' | 'md';
		class?: string;
		/** The trigger button, so a page-level keyboard cursor can focus it. */
		element?: HTMLElement | null;
		onchange?: (value: T) => void;
	}

	let {
		value = $bindable(),
		options,
		id,
		disabled = false,
		placeholder = 'Select…',
		ariaLabel,
		invalid = false,
		title,
		size = 'md',
		class: className = '',
		element = $bindable(null),
		onchange
	}: Props = $props();

	let open = $state(false);
	let active = $state(-1);
	/** Flipped above the trigger when there is not room beneath it. */
	let above = $state(false);

	let trigger = $derived(element);
	let list = $state<HTMLDivElement | null>(null);

	const listId = $props.id();

	let selected = $derived(options.find((option) => option.value === value));

	/** Height cap for the popup, so a long list scrolls rather than overflowing. */
	const MAX_LIST_HEIGHT = 288;

	async function show() {
		if (disabled || open) return;

		const box = trigger?.getBoundingClientRect();
		above = Boolean(box && window.innerHeight - box.bottom < MAX_LIST_HEIGHT && box.top > window.innerHeight - box.bottom);

		open = true;
		active = options.findIndex((option) => option.value === value);
		if (active < 0) active = options.findIndex((option) => !option.disabled);

		await tick();
		scrollActiveIntoView();
	}

	function hide() {
		open = false;
		active = -1;
	}

	function commit(index: number) {
		const option = options[index];
		if (!option || option.disabled) return;

		hide();

		if (option.value === value) return;
		value = option.value;
		onchange?.(option.value);
	}

	function scrollActiveIntoView() {
		if (active < 0) return;
		list?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' });
	}

	/** Moves the highlight, skipping disabled options and stopping at the ends. */
	function move(from: number, step: number) {
		let index = from;
		for (let guard = 0; guard < options.length; guard += 1) {
			index += step;
			if (index < 0 || index >= options.length) return from < 0 ? nearestEnd(step) : from;
			if (!options[index]!.disabled) return index;
		}
		return from;
	}

	function nearestEnd(step: number) {
		return step > 0
			? options.findIndex((option) => !option.disabled)
			: options.findLastIndex((option) => !option.disabled);
	}

	// --- typeahead -------------------------------------------------------------

	let typed = '';
	let typedAt = 0;

	function typeahead(key: string): number {
		const now = Date.now();
		// The same window a native select uses: keep typing and it narrows,
		// pause and the next letter starts a new search.
		typed = now - typedAt > 500 ? key : typed + key;
		typedAt = now;

		const current = active >= 0 ? active : options.findIndex((option) => option.value === value);

		// One repeated letter cycles through everything starting with it,
		// which is how people scan a long list without reading it.
		const repeated = typed.length > 1 && [...typed].every((letter) => letter === typed[0]);
		const needle = (repeated ? typed[0]! : typed).toLowerCase();

		// A new search looks past whatever is highlighted; a buffer that is
		// still growing has to re-test it, or "Ma" would skip the "Main" that
		// "M" just landed on.
		const from = repeated || typed.length === 1 ? current + 1 : Math.max(current, 0);

		for (let step = 0; step < options.length; step += 1) {
			const index = (from + step + options.length) % options.length;
			const option = options[index]!;
			if (option.disabled) continue;
			if (option.label.toLowerCase().startsWith(needle)) return index;
		}

		return -1;
	}

	function onkeydown(event: KeyboardEvent) {
		if (disabled) return;

		const key = event.key;

		// Anything this control understands is dealt with here and goes no
		// further: the dispatch page listens for arrows on the window, and a
		// key that means "next option" must never also mean "next vehicle".
		const handled = () => {
			event.preventDefault();
			event.stopPropagation();
		};

		if (!open) {
			if (key === 'Enter' || key === ' ' || key === 'ArrowDown' || key === 'ArrowUp') {
				handled();
				show();
				return;
			}
		} else {
			switch (key) {
				case 'Escape':
					handled();
					hide();
					return;

				case 'Enter':
				case ' ':
					handled();
					commit(active);
					return;

				case 'ArrowDown':
					handled();
					active = move(active, 1);
					scrollActiveIntoView();
					return;

				case 'ArrowUp':
					handled();
					active = move(active, -1);
					scrollActiveIntoView();
					return;

				case 'Home':
					handled();
					active = nearestEnd(1);
					scrollActiveIntoView();
					return;

				case 'End':
					handled();
					active = nearestEnd(-1);
					scrollActiveIntoView();
					return;

				case 'Tab':
					// Native selects commit on Tab and let focus move on.
					event.stopPropagation();
					commit(active);
					return;
			}
		}

		// A single printable character is a search, not a shortcut for whatever
		// else on the page is listening for that letter.
		if (key.length === 1 && !event.metaKey && !event.ctrlKey && !event.altKey) {
			const found = typeahead(key);
			if (found < 0) {
				handled();
				return;
			}

			handled();
			if (open) {
				active = found;
				scrollActiveIntoView();
			} else {
				commit(found);
			}
		}
	}

	/**
	 * Closing on an outside press.
	 *
	 * `pointerdown` rather than `click`, so pressing something else closes the
	 * popup before that thing reacts — otherwise the popup is still covering
	 * whatever was pressed at the moment it is pressed.
	 */
	function onwindowpointerdown(event: PointerEvent) {
		if (!open) return;

		const target = event.target as Node | null;
		if (target && (trigger?.contains(target) || list?.contains(target))) return;

		hide();
	}

	let sizing = $derived(
		size === 'sm' ? 'px-2 py-1 text-xs gap-1.5' : 'px-3 py-2 text-sm gap-2'
	);
</script>

<svelte:window onpointerdown={onwindowpointerdown} onresize={() => hide()} />

<div class="relative {className}">
	<button
		bind:this={element}
		{id}
		type="button"
		role="combobox"
		aria-expanded={open}
		aria-controls={listId}
		aria-haspopup="listbox"
		aria-activedescendant={open && active >= 0 ? `${listId}-${active}` : undefined}
		aria-label={ariaLabel}
		aria-invalid={invalid}
		{title}
		{disabled}
		{onkeydown}
		onclick={() => (open ? hide() : show())}
		onblur={() => hide()}
		class="flex w-full items-center rounded-lg border bg-background-secondary pr-8 text-left text-text
			transition-colors focus:outline-none disabled:cursor-not-allowed disabled:opacity-60
			{sizing}
			{invalid
			? 'border-danger bg-danger/10 text-danger focus:border-danger'
			: 'border-border-base focus:border-accent'}"
	>
		{#if selected?.color}
			<span
				class="size-2.5 shrink-0 rounded-full"
				style="background: {selected.color}"
				aria-hidden="true"
			></span>
		{:else if selected?.dot === 'note'}
			<span class="note-dot shrink-0" aria-hidden="true"></span>
		{/if}

		<span class="min-w-0 flex-1 truncate {selected ? '' : 'text-text-subtle'}">
			{selected?.label ?? placeholder}
		</span>

		<svg
			class="pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2 text-text-subtle
				transition-transform {open ? 'rotate-180' : ''}"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
			stroke-linecap="round"
			aria-hidden="true"
		>
			<path d="m6 9 6 6 6-6" />
		</svg>
	</button>

	{#if open}
		<div
			bind:this={list}
			id={listId}
			role="listbox"
			tabindex="-1"
			aria-label={ariaLabel}
			style="max-height: {MAX_LIST_HEIGHT}px"
			class="absolute z-50 w-full min-w-max overflow-y-auto rounded-lg border border-border-base
				bg-background-secondary p-1 shadow-lg shadow-black/25
				{above ? 'bottom-full mb-1' : 'top-full mt-1'}"
		>
			{#each options as option, index (option.value)}
				<div
					id="{listId}-{index}"
					data-index={index}
					role="option"
					tabindex={-1}
					aria-selected={option.value === value}
					aria-disabled={option.disabled}
					class="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm
						{option.disabled ? 'cursor-not-allowed opacity-50' : ''}
						{index === active ? 'bg-accent/15 text-text' : 'text-text-muted'}"
					onpointerenter={() => {
						if (!option.disabled) active = index;
					}}
					onpointerdown={(event) => {
						// The trigger keeps focus, so its blur handler never
						// races the selection.
						event.preventDefault();
						commit(index);
					}}
				>
					{#if option.color}
						<span
							class="size-2.5 shrink-0 rounded-full"
							style="background: {option.color}"
							aria-hidden="true"
						></span>
					{:else if option.dot === 'note'}
						<span class="note-dot shrink-0" aria-hidden="true"></span>
					{/if}

					<span class="min-w-0 flex-1 truncate">{option.label}</span>

					{#if option.hint}
						<span class="shrink-0 text-xs text-text-subtle">{option.hint}</span>
					{/if}

					{#if option.value === value}
						<svg
							class="size-3.5 shrink-0 text-accent"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="3"
							stroke-linecap="round"
							aria-hidden="true"
						>
							<path d="m5 12 5 5L20 7" />
						</svg>
					{/if}
				</div>
			{/each}
		</div>
	{/if}
</div>

<style>
	/* The mark for a written note: unmistakably not a route badge. */
	.note-dot {
		width: 0.625rem;
		height: 0.625rem;
		border-radius: 9999px;
		background: #a371f7;
		box-shadow: 0 0 0 2px rgb(163 113 247 / 0.25), 0 0 8px 1px rgb(163 113 247 / 0.65);
	}
</style>
