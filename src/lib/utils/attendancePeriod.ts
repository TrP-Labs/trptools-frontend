/**
 * The stretch of time the Attendance page counts: a calendar month
 * (`2026-10`) or a calendar quarter (`2026-Q4`), both in UTC, exactly as the
 * API counts them (`attendance/points.ts`).
 *
 * Imports nothing, so `scripts/attendance-period.test.ts` can pin it.
 */

export type PeriodKind = 'MONTH' | 'QUARTER';

/**
 * Which kind somebody last chose, kept in a cookie rather than
 * `localStorage` so the server loads the right period the first time instead
 * of working out a month only for the browser to ask for a quarter.
 */
export const PERIOD_COOKIE = 'attendance_period';

const MONTH = /^(\d{4})-(0[1-9]|1[0-2])$/;
const QUARTER = /^(\d{4})-Q([1-4])$/;

export function isPeriod(value: string | null | undefined): value is string {
	return Boolean(value && (MONTH.test(value) || QUARTER.test(value)));
}

export function kindOf(period: string): PeriodKind {
	return QUARTER.test(period) ? 'QUARTER' : 'MONTH';
}

export function periodOf(date: Date, kind: PeriodKind): string {
	const year = date.getUTCFullYear();
	if (kind === 'QUARTER') return `${year}-Q${Math.floor(date.getUTCMonth() / 3) + 1}`;
	return `${year}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

/** The first day of the period, at midnight UTC. */
export function periodStart(period: string): Date {
	const quarter = QUARTER.exec(period);
	if (quarter) return new Date(Date.UTC(Number(quarter[1]), (Number(quarter[2]) - 1) * 3, 1));
	const [year, month] = period.split('-').map(Number);
	return new Date(Date.UTC(year!, month! - 1, 1));
}

export function stepPeriod(period: string, by: number): string {
	const start = periodStart(period);
	const months = kindOf(period) === 'QUARTER' ? 3 : 1;
	return periodOf(new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + by * months, 1)), kindOf(period));
}

/**
 * The same moment seen as the other kind of period.
 *
 * A month becomes the quarter it falls in. A quarter becomes its last month
 * that has started — switching from this quarter to months should land on
 * this month, not on a month two months gone.
 */
export function convertPeriod(period: string, kind: PeriodKind, now = new Date()): string {
	if (kindOf(period) === kind) return period;
	if (kind === 'QUARTER') return periodOf(periodStart(period), 'QUARTER');
	const last = stepPeriod(periodOf(periodStart(period), 'MONTH'), 2);
	const current = periodOf(now, 'MONTH');
	return last > current ? current : last;
}
