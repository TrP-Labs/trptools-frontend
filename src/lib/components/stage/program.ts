/**
 * The stage light program format.
 *
 * A program is a time-ordered list of `[seconds, command, targets?]`, which is
 * what the game consumes and what the legacy programmer exported. Keeping the
 * exact shape means existing programs import without conversion.
 *
 * The command vocabulary below is the game's, not the site's: a marker reading
 * "Big flash" is matched against the game by that exact spelling, so those
 * arrays stay English the way a route name does. Only what a person reads —
 * the failures out of `parseProgram` — is translated.
 */
import { m } from '$lib/paraglide/messages.js';

export type ProgramEntry = [number, string, string[]?];
export type Program = ProgramEntry[];

export type MarkerKind = 'lights' | 'colors' | 'action' | 'other';

export const MARKER_COLORS: Record<MarkerKind | 'unknown', string> = {
	lights: '#a5a5a5',
	colors: '#cb5f7e',
	action: '#bbab7d',
	other: '#92bb7d',
	unknown: '#808080'
};

export const LIGHTS = [
	'DecorativeRoof',
	'DecorativeFront',
	'Default',
	'Static',
	'DecorativeDiagonal',
	'Background',
	'Tracking',
	'Audience'
];

export const COLORS = [
	'Random',
	'Red',
	'Green',
	'Blue',
	'Cyan',
	'Magenta',
	'Yellow',
	'White',
	'Orange'
];

export const ACTIONS = ['Light throw', 'Small flash', 'Big flash'];

export const OTHER_ACTIONS = [
	'Tracking Disable',
	'Tracking Enable',
	'Animated background Disable',
	'Animated background Enable'
];

/** Maps a command's first word back to the marker kind that produced it. */
const COMMAND_KINDS: Record<string, MarkerKind> = {
	Color: 'colors',
	Disable: 'lights',
	Enable: 'lights',
	Light: 'action',
	Small: 'action',
	Big: 'action',
	Tracking: 'other',
	Animated: 'other'
};

export function kindForCommand(command: string): MarkerKind | 'unknown' {
	const head = command.split(' ')[0] ?? '';
	return COMMAND_KINDS[head] ?? 'unknown';
}

export function formatTimecode(seconds: number): string {
	if (!Number.isFinite(seconds) || seconds < 0) return '0:00';

	const total = Math.floor(seconds);
	const hours = Math.floor(total / 3600);
	const minutes = Math.floor((total % 3600) / 60);
	const secs = total % 60;

	const body = `${minutes}:${String(secs).padStart(2, '0')}`;
	return hours > 0 ? `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}` : body;
}

/**
 * Validates an imported program.
 *
 * Imports come from a textarea, so this has to reject anything malformed
 * rather than trusting it into the editor.
 */
export function parseProgram(raw: string): { program: Program } | { error: string } {
	let parsed: unknown;

	try {
		parsed = JSON.parse(raw);
	} catch {
		return { error: m.stage_not_valid_json() };
	}

	if (!Array.isArray(parsed)) return { error: m.stage_program_must_be_array() };

	const program: Program = [];

	for (const [index, entry] of parsed.entries()) {
		if (!Array.isArray(entry) || entry.length < 2) {
			return { error: m.stage_marker_must_be_time_command({ marker: index + 1 }) };
		}

		const [time, command, targets] = entry as [unknown, unknown, unknown];

		if (typeof time !== 'number' || !Number.isFinite(time) || time < 0) {
			return { error: m.stage_marker_invalid_time({ marker: index + 1 }) };
		}

		if (typeof command !== 'string' || command.length === 0) {
			return { error: m.stage_marker_invalid_command({ marker: index + 1 }) };
		}

		if (targets !== undefined) {
			if (!Array.isArray(targets) || targets.some((value) => typeof value !== 'string')) {
				return { error: m.stage_marker_invalid_targets({ marker: index + 1 }) };
			}
			program.push([time, command, targets as string[]]);
		} else {
			program.push([time, command]);
		}
	}

	return { program: program.sort((a, b) => a[0] - b[0]) };
}

export function serialiseProgram(program: Program): string {
	return JSON.stringify([...program].sort((a, b) => a[0] - b[0]));
}

/** A short human description of a marker, for the timeline list. */
export function describeEntry(entry: ProgramEntry): string {
	const [, command, targets] = entry;
	if (!targets || targets.length === 0) return command;
	return `${command} — ${targets.join(', ')}`;
}
