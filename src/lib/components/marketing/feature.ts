import type { Icon } from '@tabler/icons-svelte';

/**
 * One card in a marketing bento grid.
 *
 * Text is held as message *functions* rather than strings so a card renders
 * in whatever language the request resolved, not the language the module
 * happened to be evaluated in.
 */
export type Feature = {
	title: () => string;
	body?: () => string;
	/** The back of the card: a few terse lines. A card with none does not flip. */
	details?: Array<() => string>;
	icon?: Icon;
	/**
	 * A screenshot in `static/marketing`. Themed shots exist as
	 * `<name>-dim.webp` and `<name>-light.webp`; an unthemed one is a single
	 * file that looks the same everywhere (the bot's rendered board).
	 * `width` overrides how wide it is drawn, for a crop that should be seen whole.
	 */
	shot?: { name: string; themed?: boolean; side?: 'right' | 'bottom'; width?: string };
	span?: 'wide' | 'tall' | 'big';
	tone?: 'accent';
	/** A large figure drawn in place of an icon. Not translated: numbers only. */
	stat?: string;
	link?: { href: string; label: () => string };
	/** A short code shown above the title, such as a slash command. Never translated. */
	chip?: string;
	/** Names a snippet the page passes in, for cards that draw more than text. */
	visual?: string;
};
