/** Colour maths for route badges and accent surfaces. */

export function normaliseHex(value: string): string {
	const trimmed = value.trim();
	const withHash = trimmed.startsWith('#') ? trimmed : `#${trimmed}`;

	if (/^#[0-9a-f]{3}$/i.test(withHash)) {
		const [, r, g, b] = withHash;
		return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
	}

	return /^#[0-9a-f]{6}$/i.test(withHash) ? withHash.toLowerCase() : '#4287f5';
}

function channels(hex: string): [number, number, number] {
	const value = normaliseHex(hex).slice(1);
	return [
		parseInt(value.slice(0, 2), 16),
		parseInt(value.slice(2, 4), 16),
		parseInt(value.slice(4, 6), 16)
	];
}

/** Relative luminance, per WCAG. */
export function luminance(hex: string): number {
	const [r, g, b] = channels(hex).map((channel) => {
		const ratio = channel / 255;
		return ratio <= 0.03928 ? ratio / 12.92 : ((ratio + 0.055) / 1.055) ** 2.4;
	}) as [number, number, number];

	return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Picks black or white text for a coloured background.
 *
 * Route colours are chosen freely by group managers, so the label has to
 * adapt or it will be unreadable on light and dark routes alike.
 */
export function readableText(background: string): string {
	return luminance(background) > 0.45 ? '#111111' : '#ffffff';
}

export function withAlpha(hex: string, alpha: number): string {
	const [r, g, b] = channels(hex);
	return `rgb(${r} ${g} ${b} / ${alpha})`;
}

export function isValidHex(value: string): boolean {
	return /^#[0-9a-f]{6}$/i.test(value.trim());
}
