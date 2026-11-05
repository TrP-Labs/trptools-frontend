import { m } from '$lib/paraglide/messages.js';

/**
 * The API key scope catalogue, grouped the way the picker draws it.
 *
 * Mirrors `src/utils/apiScopes.ts` in the backend, the same way the
 * permission bits are mirrored: the strings are stored on issued keys, so the
 * two lists are a contract. A scope this list does not know is still shown on
 * a key, by its raw name.
 */
export const SCOPE_CATEGORIES = [
	{
		id: 'groups',
		scopes: ['groups:read', 'groups:write', 'ranks:read', 'ranks:write', 'bot:read', 'bot:write', 'media:read', 'media:write', 'statistics:read']
	},
	{
		id: 'people',
		scopes: ['applications:read', 'applications:write', 'claimables:read', 'claimables:write', 'attendance:read', 'attendance:write']
	},
	{ id: 'routes', scopes: ['routes:read', 'routes:write', 'depots:read', 'depots:write'] },
	{ id: 'schedule', scopes: ['schedule:read', 'schedule:write', 'signups:read', 'signups:write'] },
	{ id: 'dispatch', scopes: ['dispatch:read', 'dispatch:write', 'rooms:read', 'rooms:write', 'host:read', 'host:write'] },
	{ id: 'driver', scopes: ['driver:read'] },
	{ id: 'account', scopes: ['profile:read', 'dashboard:read', 'notifications:read'] }
] as const;

export type ScopeCategory = (typeof SCOPE_CATEGORIES)[number]['id'];

export const DEFAULT_SCOPES = ['groups:read', 'routes:read', 'schedule:read'];

export function categoryLabel(id: ScopeCategory): string {
	return {
		groups: m.settings_api_keys_category_groups,
		people: m.settings_api_keys_category_people,
		routes: m.settings_api_keys_category_routes,
		schedule: m.settings_api_keys_category_schedule,
		dispatch: m.settings_api_keys_category_dispatch,
		driver: m.settings_api_keys_category_driver,
		account: m.settings_api_keys_category_account
	}[id]();
}

const descriptions: Record<string, () => string> = {
	'groups:read': m.settings_api_keys_scope_groups_read,
	'groups:write': m.settings_api_keys_scope_groups_write,
	'ranks:read': m.settings_api_keys_scope_ranks_read,
	'ranks:write': m.settings_api_keys_scope_ranks_write,
	'bot:read': m.settings_api_keys_scope_bot_read,
	'bot:write': m.settings_api_keys_scope_bot_write,
	'media:read': m.settings_api_keys_scope_media_read,
	'media:write': m.settings_api_keys_scope_media_write,
	'statistics:read': m.settings_api_keys_scope_statistics_read,
	'applications:read': m.settings_api_keys_scope_applications_read,
	'applications:write': m.settings_api_keys_scope_applications_write,
	'claimables:read': m.settings_api_keys_scope_claimables_read,
	'claimables:write': m.settings_api_keys_scope_claimables_write,
	'attendance:read': m.settings_api_keys_scope_attendance_read,
	'attendance:write': m.settings_api_keys_scope_attendance_write,
	'routes:read': m.settings_api_keys_scope_routes_read,
	'routes:write': m.settings_api_keys_scope_routes_write,
	'depots:read': m.settings_api_keys_scope_depots_read,
	'depots:write': m.settings_api_keys_scope_depots_write,
	'schedule:read': m.settings_api_keys_scope_schedule_read,
	'schedule:write': m.settings_api_keys_scope_schedule_write,
	'signups:read': m.settings_api_keys_scope_signups_read,
	'signups:write': m.settings_api_keys_scope_signups_write,
	'dispatch:read': m.settings_api_keys_scope_dispatch_read,
	'dispatch:write': m.settings_api_keys_scope_dispatch_write,
	'rooms:read': m.settings_api_keys_scope_rooms_read,
	'rooms:write': m.settings_api_keys_scope_rooms_write,
	'host:read': m.settings_api_keys_scope_host_read,
	'host:write': m.settings_api_keys_scope_host_write,
	'driver:read': m.settings_api_keys_scope_driver_read,
	'profile:read': m.settings_api_keys_scope_profile_read,
	'dashboard:read': m.settings_api_keys_scope_dashboard_read,
	'notifications:read': m.settings_api_keys_scope_notifications_read
};

export function scopeDescription(scope: string): string | null {
	return descriptions[scope]?.() ?? null;
}
