import { Frequency, RRule, rrulestr, Weekday } from 'rrule';
import { m } from '$lib/paraglide/messages.js';

/**
 * A small, opinionated slice of RRULE.
 *
 * Groups need "every weekday at 18:00" and "every Saturday and Sunday", not the
 * whole iCalendar grammar. This models that subset for the builder UI while
 * still round-tripping any rule the backend accepts.
 */

export type Repeat = 'DAILY' | 'WEEKLY' | 'FORTNIGHTLY' | 'WEEKDAYS' | 'WEEKENDS' | 'MONTHLY';

export const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const WEEKDAYS = [RRule.MO, RRule.TU, RRule.WE, RRule.TH, RRule.FR, RRule.SA, RRule.SU];

export interface RecurrenceDraft {
	repeat: Repeat;
	/** Indices into WEEKDAY_LABELS, used when repeat is WEEKLY or FORTNIGHTLY. */
	days: number[];
}

/**
 * How many days the start's UTC weekday is ahead of its local one: -1, 0 or 1.
 *
 * A rule's BYDAY is read in UTC, because that is how the API expands it, but
 * the days a manager ticks are the days on their own calendar. An evening
 * shift west of Greenwich falls on the next UTC day — Monday 20:00 in New
 * York is Tuesday in UTC — so writing the ticked days straight into BYDAY put
 * every such shift a day early, and left the first one outside its own rule.
 */
function utcDayShift(start: Date): number {
	const difference = (start.getUTCDay() - start.getDay() + 7) % 7;
	return difference === 6 ? -1 : difference;
}

/** The repeats that let the member pick which days of the week they land on. */
export function picksDays(repeat: Repeat): boolean {
	return repeat === 'WEEKLY' || repeat === 'FORTNIGHTLY';
}

export function buildRule(draft: RecurrenceDraft, start: Date): string {
	const base = { dtstart: start };

	switch (draft.repeat) {
		case 'DAILY':
			return new RRule({ ...base, freq: Frequency.DAILY }).toString();

		// The presets are days on the manager's calendar too, so they go
		// through the same translation into UTC as days picked by hand.
		case 'WEEKDAYS':
			return weeklyRule(start, [0, 1, 2, 3, 4]);

		case 'WEEKENDS':
			return weeklyRule(start, [5, 6]);

		case 'MONTHLY':
			return new RRule({ ...base, freq: Frequency.MONTHLY }).toString();

		case 'FORTNIGHTLY':
		case 'WEEKLY':
		default:
			return weeklyRule(start, draft.days, draft.repeat === 'FORTNIGHTLY');
	}
}

function weeklyRule(start: Date, days: number[], fortnightly = false): string {
	const shift = utcDayShift(start);
	const selected: Weekday[] = days
		.map((index) => WEEKDAYS[(index + shift + 7) % 7])
		.filter((day): day is Weekday => Boolean(day));

	return new RRule({
		dtstart: start,
		freq: Frequency.WEEKLY,
		// A fortnight is a weekly rule that skips every other week. The
		// interval counts from DTSTART, so the first occurrence is the start
		// date and every second week after it. Left off entirely for a plain
		// weekly rule so existing rules keep their exact stored text.
		...(fortnightly ? { interval: 2 } : {}),
		byweekday: selected.length > 0 ? selected : [WEEKDAYS[start.getUTCDay() === 0 ? 6 : start.getUTCDay() - 1]!]
	}).toString();
}

/** Best-effort read of an existing rule back into the builder's shape. */
export function parseRule(rule: string, start?: Date): RecurrenceDraft {
	try {
		const parsed = rrulestr(rule) as RRule;
		const options = parsed.options;

		if (options.freq === Frequency.DAILY) return { repeat: 'DAILY', days: [] };
		if (options.freq === Frequency.MONTHLY) return { repeat: 'MONTHLY', days: [] };

		// Back onto the reader's own calendar; see `utcDayShift`.
		const shift = start ? utcDayShift(start) : 0;
		const days = ((options.byweekday ?? []) as number[]).map((day) => (day - shift + 7) % 7).sort();

		// The interval has to be read back, not just written. Without this a
		// fortnightly shift would open in the editor as a weekly one and be
		// saved back at half its intended spacing.
		if ((options.interval ?? 1) > 1) return { repeat: 'FORTNIGHTLY', days: [...days] };

		const isWeekdays = days.length === 5 && [0, 1, 2, 3, 4].every((day) => days.includes(day));
		if (isWeekdays) return { repeat: 'WEEKDAYS', days: [] };

		const isWeekends = days.length === 2 && days.includes(5) && days.includes(6);
		if (isWeekends) return { repeat: 'WEEKENDS', days: [] };

		return { repeat: 'WEEKLY', days: [...days] };
	} catch {
		return { repeat: 'WEEKLY', days: [] };
	}
}

/** A human sentence for a rule, e.g. "every week on Monday". */
export function describeRule(rule: string): string {
	try {
		return (rrulestr(rule) as RRule).toText();
	} catch {
		return m.recurrence_custom();
	}
}

/** `<input type="datetime-local">` wants a local, zoneless string. */
export function toLocalInput(date: Date): string {
	const pad = (value: number) => String(value).padStart(2, '0');
	return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function fromLocalInput(value: string): Date {
	const parsed = new Date(value);
	return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}
