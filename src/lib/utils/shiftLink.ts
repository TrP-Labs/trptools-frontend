import type { DashboardShift } from '$lib/api/types';
/** Open the permanent page for the particular date shown in the widget. */
export function shiftLink(shift: DashboardShift): string {
    return `/g/${shift.groupSlug}/shift/${shift.slug}/${new Date(shift.start).getTime()}`;
}
