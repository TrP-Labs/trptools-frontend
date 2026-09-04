<script lang="ts">
	import { isValidHex, normaliseHex } from '$lib/utils/color';
	import { m } from '$lib/paraglide/messages.js';

	interface Props {
		value: string;
		id?: string;
		disabled?: boolean;
		/** Fired once the colour settles, not on every keystroke or drag frame. */
		oncommit?: (value: string) => void;
	}

	let { value = $bindable('#4287f5'), id, disabled = false, oncommit }: Props = $props();

	// svelte-ignore state_referenced_locally
	let text = $state(value);

	// Typing a partial hex should not clobber the swatch mid-keystroke, so the
	// bound value only updates once the text is a complete colour.
	$effect(() => {
		text = value;
	});

	function commitText() {
		if (isValidHex(text)) {
			value = normaliseHex(text);
			oncommit?.(value);
		} else {
			text = value;
		}
	}
</script>

<div class="flex items-center gap-2">
	<label
		class="relative size-9 shrink-0 cursor-pointer overflow-hidden rounded-lg border border-border-base"
		style="background: {value}"
	>
		<span class="sr-only">{m.ui_color_input_pick_color()}</span>
		<input
			{id}
			type="color"
			bind:value
			{disabled}
			onchange={() => oncommit?.(value)}
			class="absolute inset-0 cursor-pointer opacity-0"
		/>
	</label>

	<input
		type="text"
		bind:value={text}
		onblur={commitText}
		onkeydown={(event) => event.key === 'Enter' && commitText()}
		{disabled}
		spellcheck="false"
		maxlength="7"
		class="w-28 rounded-lg border border-border-base bg-background-secondary px-3 py-2 font-mono text-sm
			text-text uppercase focus:border-accent focus:outline-none disabled:opacity-60"
	/>
</div>
