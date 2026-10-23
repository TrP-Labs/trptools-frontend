import { describe, expect, test } from 'bun:test';
import { convertPeriod, isPeriod, kindOf, periodOf, periodStart, stepPeriod } from '../src/lib/utils/attendancePeriod';

describe('attendance periods', () => {
	test('recognises months and quarters, and nothing else', () => {
		expect(isPeriod('2026-10')).toBe(true);
		expect(isPeriod('2026-Q4')).toBe(true);
		expect(isPeriod('2026-13')).toBe(false);
		expect(isPeriod('2026-Q5')).toBe(false);
		expect(isPeriod(null)).toBe(false);
		expect(kindOf('2026-Q1')).toBe('QUARTER');
		expect(kindOf('2026-01')).toBe('MONTH');
	});

	test('counts in UTC, like the API', () => {
		expect(periodOf(new Date('2026-09-30T23:59:00Z'), 'QUARTER')).toBe('2026-Q3');
		expect(periodOf(new Date('2026-10-01T00:00:00Z'), 'MONTH')).toBe('2026-10');
		expect(periodStart('2026-Q4').toISOString()).toBe('2026-10-01T00:00:00.000Z');
	});

	test('steps across year boundaries', () => {
		expect(stepPeriod('2026-12', 1)).toBe('2027-01');
		expect(stepPeriod('2026-01', -1)).toBe('2025-12');
		expect(stepPeriod('2026-Q4', 1)).toBe('2027-Q1');
		expect(stepPeriod('2026-Q1', -1)).toBe('2025-Q4');
	});

	test('converting keeps the same stretch of time in view', () => {
		const now = new Date('2026-10-23T12:00:00Z');
		expect(convertPeriod('2026-08', 'QUARTER', now)).toBe('2026-Q3');
		expect(convertPeriod('2026-Q3', 'MONTH', now)).toBe('2026-09');
		// This quarter's last month has not started: land on this month.
		expect(convertPeriod('2026-Q4', 'MONTH', now)).toBe('2026-10');
		expect(convertPeriod('2026-10', 'MONTH', now)).toBe('2026-10');
	});
});
