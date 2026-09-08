import {
	IconBrandDiscord,
	IconBuildingWarehouse,
	IconEye,
	IconHistory,
	IconCalendarTime,
	IconCloudLock,
	IconWorld,
	type Icon
} from '@tabler/icons-svelte';
import { PERM } from '$lib/utils/permissions';
import { m } from '$lib/paraglide/messages.js';

/**
 * The parts of a group's settings, and the grant each one needs.
 *
 * Settings was one page of stacked cards that grew every time the group gained
 * something to configure — the same accretion the rank editor hit (§10.1) —
 * and with grants split up, a rank that may only keep the vehicle table would
 * have opened a page of controls it could not save. Each part is a section
 * with an address, and the ones the viewer does not hold are not drawn.
 */
export interface SettingsSection {
	id: string;
	label: string;
	icon: Icon;
	permission: number;
}

export function settingsSections(): SettingsSection[] {
	return [
		{ id: 'page', label: m.dashboard_settings_section_page(), icon: IconWorld, permission: PERM.MANAGE_GROUP },
		{
			id: 'visibility',
			label: m.dashboard_settings_section_visibility(),
			icon: IconEye,
			permission: PERM.MANAGE_VISIBILITY
		},
		{
			id: 'shifts',
			label: m.common_shifts(),
			icon: IconCalendarTime,
			permission: PERM.MANAGE_SHIFTS
		},
		/**
		 * Filed under the grant that already means "this group's Discord",
		 * rather than split across shifts and applications: it is one decision
		 * about how a group is reachable, and splitting it would mean neither
		 * rank could see the pair of switches together.
		 */
		{
			id: 'discord',
			label: m.dashboard_settings_section_discord(),
			icon: IconBrandDiscord,
			permission: PERM.MANAGE_BOT
		},
		{
			id: 'vehicles',
			label: m.dashboard_settings_section_vehicles(),
			icon: IconBuildingWarehouse,
			permission: PERM.MANAGE_VEHICLES
		},
		{
			id: 'opencloud',
			label: m.dashboard_settings_section_open_cloud(),
			icon: IconCloudLock,
			permission: PERM.MANAGE_OPEN_CLOUD
		},
		{
			id: 'audit',
			label: m.dashboard_settings_section_audit_log(),
			icon: IconHistory,
			permission: PERM.VIEW_AUDIT_LOG
		}
	];
}

/** Any grant that opens settings at all, for the sidebar and the page guard. */
export const SETTINGS_GRANTS = [
	PERM.MANAGE_GROUP,
	PERM.MANAGE_VISIBILITY,
	PERM.MANAGE_SHIFTS,
	PERM.MANAGE_BOT,
	PERM.MANAGE_VEHICLES,
	PERM.MANAGE_OPEN_CLOUD,
	PERM.VIEW_AUDIT_LOG
];
