import { m } from '$lib/paraglide/messages.js';

/**
 * What a rank may do, mirroring `utils/permissions.ts` on the API.
 *
 * The numbers are a contract between the two projects — they are what is
 * stored in `rank_relations.permissions` — so they are written out here rather
 * than derived from the API surface, exactly as the four-level ladder already
 * was. The server enforces every one of them independently; this only decides
 * what the dashboard offers.
 */
export const PERM = {
	VIEW_DASHBOARD: 1 << 0,

	DISPATCH: 1 << 1,
	START_ROOM: 1 << 2,

	MANAGE_SHIFTS: 1 << 3,
	MANAGE_ROUTES: 1 << 4,
	MANAGE_DEPOTS: 1 << 5,
	MANAGE_RANKS: 1 << 6,

	MANAGE_APPLICATIONS: 1 << 7,
	REVIEW_APPLICATIONS: 1 << 8,

	MANAGE_BOT: 1 << 9,
	MANAGE_VEHICLES: 1 << 10,
	MANAGE_GROUP: 1 << 11,
	MANAGE_VISIBILITY: 1 << 12,
	MANAGE_OPEN_CLOUD: 1 << 13,
	VIEW_AUDIT_LOG: 1 << 14,

	ADMINISTRATOR: 1 << 15
} as const;

export type PermissionFlag = (typeof PERM)[keyof typeof PERM];

export const ALL_PERMISSIONS = Object.values(PERM).reduce((all, flag) => all | flag, 0);

/**
 * Whether a set of grants carries a flag.
 *
 * Administrator answers yes to everything, so a screen added in a later
 * release is open to the ranks that were meant to have it.
 */
export function can(permissions: number, flag: number): boolean {
	if (permissions & PERM.ADMINISTRATOR) return true;
	return (permissions & flag) === flag;
}

/** Whether a set of grants carries any of several flags. */
export function canAny(permissions: number, flags: number[]): boolean {
	return flags.some((flag) => can(permissions, flag));
}

/** The presets the rank editor offers, matching the old four-level ladder. */
export const LEVEL_PERMISSIONS: Record<number, number> = {
	0: 0,
	1: PERM.VIEW_DASHBOARD | PERM.DISPATCH,
	2:
		PERM.VIEW_DASHBOARD |
		PERM.DISPATCH |
		PERM.START_ROOM |
		PERM.MANAGE_SHIFTS |
		PERM.REVIEW_APPLICATIONS,
	3: ALL_PERMISSIONS
};

/**
 * The grants, grouped the way they are read rather than the way they are
 * numbered.
 *
 * A label table is a function, like every other one in the codebase: a
 * constant object is built when the module is first imported, which on the
 * server happens before any request has established a locale — the first
 * language rendered would be baked in for every later one.
 */
export interface PermissionGroup {
	id: string;
	label: string;
	permissions: { flag: number; label: string; description: string }[];
}

export function permissionGroups(): PermissionGroup[] {
	return [
		{
			id: 'general',
			label: m.permissions_group_general(),
			permissions: [
				{
					flag: PERM.ADMINISTRATOR,
					label: m.permission_administrator(),
					description: m.permission_administrator_hint()
				},
				{
					flag: PERM.VIEW_DASHBOARD,
					label: m.permission_view_dashboard(),
					description: m.permission_view_dashboard_hint()
				},
				{
					flag: PERM.VIEW_AUDIT_LOG,
					label: m.permission_view_audit_log(),
					description: m.permission_view_audit_log_hint()
				}
			]
		},
		{
			id: 'dispatch',
			label: m.permissions_group_dispatch(),
			permissions: [
				{
					flag: PERM.DISPATCH,
					label: m.permission_dispatch_flag(),
					description: m.permission_dispatch_flag_hint()
				},
				{
					flag: PERM.START_ROOM,
					label: m.permission_start_room(),
					description: m.permission_start_room_hint()
				},
				{
					flag: PERM.MANAGE_SHIFTS,
					label: m.permission_manage_shifts(),
					description: m.permission_manage_shifts_hint()
				}
			]
		},
		{
			id: 'network',
			label: m.permissions_group_network(),
			permissions: [
				{
					flag: PERM.MANAGE_ROUTES,
					label: m.permission_manage_routes(),
					description: m.permission_manage_routes_hint()
				},
				{
					flag: PERM.MANAGE_DEPOTS,
					label: m.permission_manage_depots(),
					description: m.permission_manage_depots_hint()
				},
				{
					flag: PERM.MANAGE_VEHICLES,
					label: m.permission_manage_vehicles(),
					description: m.permission_manage_vehicles_hint()
				}
			]
		},
		{
			id: 'people',
			label: m.permissions_group_people(),
			permissions: [
				{
					flag: PERM.MANAGE_RANKS,
					label: m.permission_manage_ranks(),
					description: m.permission_manage_ranks_hint()
				},
				{
					flag: PERM.MANAGE_APPLICATIONS,
					label: m.permission_manage_applications(),
					description: m.permission_manage_applications_hint()
				},
				{
					flag: PERM.REVIEW_APPLICATIONS,
					label: m.permission_review_applications(),
					description: m.permission_review_applications_hint()
				}
			]
		},
		{
			id: 'group',
			label: m.permissions_group_settings(),
			permissions: [
				{
					flag: PERM.MANAGE_GROUP,
					label: m.permission_manage_group_page(),
					description: m.permission_manage_group_page_hint()
				},
				{
					flag: PERM.MANAGE_VISIBILITY,
					label: m.permission_manage_visibility(),
					description: m.permission_manage_visibility_hint()
				},
				{
					flag: PERM.MANAGE_BOT,
					label: m.permission_manage_bot(),
					description: m.permission_manage_bot_hint()
				},
				{
					flag: PERM.MANAGE_OPEN_CLOUD,
					label: m.permission_manage_open_cloud(),
					description: m.permission_manage_open_cloud_hint()
				}
			]
		}
	];
}

/** How many grants a rank holds, for the summary line on its card. */
export function grantCount(permissions: number): number {
	if (can(permissions, PERM.ADMINISTRATOR)) return ALL_PERMISSIONS.toString(2).split('1').length - 1;

	let held = 0;
	for (let bit = permissions; bit > 0; bit >>= 1) held += bit & 1;
	return held;
}
