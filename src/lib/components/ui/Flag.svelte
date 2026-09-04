<script lang="ts">
	/**
	 * A flag for a language, drawn inline.
	 *
	 * Emoji flags were the obvious first answer and are the wrong one: Segoe UI
	 * Emoji carries no country-flag glyphs, so every Windows viewer sees a pair
	 * of letters instead — and a Roblox audience is heavily Windows. These are
	 * geometry instead, so they render the same everywhere and cost no request.
	 *
	 * One component rather than a file per flag: there is exactly one consumer,
	 * and six four-line SVGs spread across six files would be harder to compare
	 * than to read together.
	 *
	 * A flag is not a language — Russian is spoken well beyond Russia, and
	 * English is not the United States. This is a recognition aid next to a name
	 * written in its own language, which is what people actually scan for; the
	 * endonym is the label, and the flag is decoration, which is why it is
	 * `aria-hidden`.
	 *
	 * 640×480 is the conventional viewBox for flag sets, and keeps the United
	 * States' thirteen stripes on whole-ish numbers.
	 */
	interface Props {
		/** A language tag. An unknown one draws nothing rather than guessing. */
		locale: string;
		class?: string;
	}

	let { locale, class: className = '' }: Props = $props();

	/** The country whose flag stands in for each language we ship. */
	const FLAG: Record<string, string> = {
		en: 'us',
		cs: 'cz',
		de: 'de',
		pl: 'pl',
		ru: 'ru',
		uk: 'ua'
	};

	// A regional tag falls back to its base language, so `en-US` and `en-GB`
	// both find `en` rather than dropping to nothing.
	let flag = $derived(FLAG[locale] ?? FLAG[locale.split('-')[0]]);

	const STRIPES = Array.from({ length: 13 }, (_, i) => i);
	// Five rows of six and four rows of five, the real alternating arrangement.
	const STARS = Array.from({ length: 9 }, (_, row) =>
		Array.from({ length: row % 2 === 0 ? 6 : 5 }, (_, col) => ({
			x: 24 + col * 42 + (row % 2 === 0 ? 0 : 21),
			y: 20 + row * 27
		}))
	).flat();
</script>

{#if flag}
	<svg
		viewBox="0 0 640 480"
		class={className}
		aria-hidden="true"
		preserveAspectRatio="xMidYMid slice"
	>
		{#if flag === 'us'}
			<rect width="640" height="480" fill="#fff" />
			{#each STRIPES as i (i)}
				{#if i % 2 === 0}
					<rect y={i * 36.92} width="640" height="36.92" fill="#b22234" />
				{/if}
			{/each}
			<rect width="256" height="258.46" fill="#3c3b6e" />
			{#each STARS as star (`${star.x}-${star.y}`)}
				<circle cx={star.x} cy={star.y} r="8" fill="#fff" />
			{/each}
		{:else if flag === 'de'}
			<rect width="640" height="160" fill="#000" />
			<rect y="160" width="640" height="160" fill="#d00" />
			<rect y="320" width="640" height="160" fill="#ffce00" />
		{:else if flag === 'pl'}
			<rect width="640" height="240" fill="#fff" />
			<rect y="240" width="640" height="240" fill="#dc143c" />
		{:else if flag === 'ru'}
			<rect width="640" height="160" fill="#fff" />
			<rect y="160" width="640" height="160" fill="#0039a6" />
			<rect y="320" width="640" height="160" fill="#d52b1e" />
		{:else if flag === 'ua'}
			<rect width="640" height="240" fill="#0057b7" />
			<rect y="240" width="640" height="240" fill="#ffd700" />
		{:else if flag === 'cz'}
			<rect width="640" height="240" fill="#fff" />
			<rect y="240" width="640" height="240" fill="#d7141a" />
			<path d="M0 0l320 240L0 480z" fill="#11457e" />
		{/if}
	</svg>
{/if}
