<script lang="ts">
	/**
	 * The coloured dot the pickers use to say whether the bot can do something.
	 *
	 * Both pickers show several of these per row, so the tooltip and the
	 * accessible name live here rather than being restated at every call site
	 * — a bare colour is meaningless to a screen reader and to anyone who
	 * cannot separate the two hues.
	 */
	interface Props {
		ok: boolean;
		/** What the dot is reporting on, e.g. "Send messages". */
		label: string;
		okText?: string;
		failText?: string;
	}

	let { ok, label, okText = 'yes', failText = 'no' }: Props = $props();

	let title = $derived(`${label}: ${ok ? okText : failText}`);
</script>

<span class="inline-flex items-center gap-1" {title}>
	<span
		aria-hidden="true"
		class="size-1.5 shrink-0 rounded-full {ok ? 'bg-success' : 'bg-danger'}"
	></span>
	<span class="text-[0.6875rem] {ok ? 'text-text-subtle' : 'text-danger'}">{label}</span>
	<span class="sr-only">{title}</span>
</span>
