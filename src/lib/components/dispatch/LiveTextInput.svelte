<script lang="ts">
	/**
	 * A text field on a live board.
	 *
	 * Everything else on a dispatch row is a single click that saves at once.
	 * Text is not: it is typed over several seconds, during which the same
	 * vehicle can arrive again down the stream because somebody across the room
	 * ticked it assigned. Binding straight to the vehicle would either send a
	 * request per keystroke or lose what is being typed to an unrelated update.
	 *
	 * So the draft is local, the incoming value is only allowed to replace it
	 * while the field is not focused, and it saves on blur or Enter — which is
	 * also when a native form control would consider itself changed.
	 */
	interface Props {
		value: string;
		placeholder?: string;
		disabled?: boolean;
		ariaLabel: string;
		maxlength?: number;
		class?: string;
		element?: HTMLElement | null;
		onsave: (value: string) => void;
	}

	let {
		value,
		placeholder,
		disabled = false,
		ariaLabel,
		maxlength = 120,
		class: className = '',
		element = $bindable(null),
		onsave
	}: Props = $props();

	// Seeded by the effect below rather than here, so there is exactly one
	// place that decides when the incoming value may replace what is typed.
	let draft = $state('');
	let focused = $state(false);

	$effect(() => {
		// Reading `value` is what subscribes this to the stream's updates.
		const incoming = value;
		if (!focused) draft = incoming;
	});

	function save() {
		const next = draft.trim();
		if (next === value) return;
		onsave(next);
	}
</script>

<input
	bind:this={element}
	bind:value={draft}
	type="text"
	{placeholder}
	{disabled}
	{maxlength}
	aria-label={ariaLabel}
	spellcheck="false"
	onfocus={() => (focused = true)}
	onblur={() => {
		focused = false;
		save();
	}}
	onkeydown={(event) => {
		// Enter is the only key this field takes off the board.
		//
		// It used to take all of them, to stop the cursor's arrows and its
		// Backspace acting while somebody was typing — and that trapped the
		// cursor in the field, because the arrows are also the only way out of
		// it. Left and Right now step to the next control, saving on the way,
		// which is what they do everywhere else on the row. Home and End still
		// move the caret; the board ignores them inside a cell.
		if (event.key === 'Enter') {
			// Saved, but focus stays: committing a value is not the same as
			// being finished with the field.
			event.preventDefault();
			event.stopPropagation();
			save();
			return;
		}

		// Escape means the same thing here as it does to the board: back out.
		// Throwing away the edit is this field's part of that, and stepping the
		// cursor back to the row is the board's, so it travels on.
		if (event.key === 'Escape') {
			event.preventDefault();
			draft = value;
			event.currentTarget.blur();
		}
	}}
	class="min-w-0 rounded-md border border-border-base bg-background-secondary px-2 py-1 text-xs
		text-text placeholder:text-text-subtle focus:border-accent focus:outline-none
		disabled:opacity-60 {className}"
/>
