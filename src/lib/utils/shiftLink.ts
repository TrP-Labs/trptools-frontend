import type { DashboardShift } from '$lib/api/types';
/** Recurring shifts share one page; a widget must still open the date clicked. */
export function shiftLink(shift: DashboardShift): string {
    return `/g/${shift.groupSlug}/shift/${shift.slug}#occurrence-${new Date(shift.start).getTime()}`;
}
