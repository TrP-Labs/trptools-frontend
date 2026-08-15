import { Frequency, RRule, rrulestr, Weekday } from 'rrule';

/**
 * A small, opinionated slice of RRULE.
 *
 * Groups need "every weekday at 18:00" and "every Saturday and Sunday", not the
 * whole iCalendar grammar. This models that subset for the builder UI while
 * still round-tripping any rule the backend accepts.
 */

export type Repeat = 'DAILY' | 'WEEKLY' | 'WEEKDAYS' | 'WEEKENDS' | 'MONTHLY';

export const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const WEEKDAYS = [RRule.MO, RRule.TU, RRule.WE, RRule.TH, RRule.FR, RRule.SA, RRule.SU];

export interface RecurrenceDraft {
	repeat: Repeat;
	/** Indices into WEEKDAY_LABELS, used when repeat is WEEKLY. */
	days: number[];
}

export function buildRule(draft: RecurrenceDraft, start: Date): string {
	const base = { dtstart: start };

	switch (draft.repeat) {
		case 'DAILY':
			return new RRule({ ...base, freq: Frequency.DAILY }).toString();

		case 'WEEKDAYS':
			return new RRule({
				...base,
				freq: Frequency.WEEKLY,
				byweekday: [RRule.MO, RRule.TU, RRule.WE, RRule.TH, RRule.FR]
			}).toString();

		case 'WEEKENDS':
			return new RRule({
				...base,
				freq: Frequency.WEEKLY,
				byweekday: [RRule.SA, RRule.SU]
			}).toString();

		case 'MONTHLY':
			return new RRule({ ...base, freq: Frequency.MONTHLY }).toString();

		case 'WEEKLY':
		default: {
			const selected: Weekday[] = draft.days
				.map((index) => WEEKDAYS[index])
				.filter((day): day is Weekday => Boolean(day));

			return new RRule({
				...base,
				freq: Frequency.WEEKLY,
				byweekday: selected.length > 0 ? selected : [WEEKDAYS[start.getDay() === 0 ? 6 : start.getDay() - 1]!]
			}).toString();
		}
	}
}

/** Best-effort read of an existing rule back into the builder's shape. */
export function parseRule(rule: string): RecurrenceDraft {
	try {
		const parsed = rrulestr(rule) as RRule;
		const options = parsed.options;

		if (options.freq === Frequency.DAILY) return { repeat: 'DAILY', days: [] };
		if (options.freq === Frequency.MONTHLY) return { repeat: 'MONTHLY', days: [] };

		const days = (options.byweekday ?? []) as number[];

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
		return 'Custom recurrence';
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
