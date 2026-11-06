import {
	IconAward, IconBell, IconBolt, IconBrandDiscord, IconBulb, IconCalendarEvent, IconClock, IconCloudDataConnection,
	IconCode, IconHistory, IconKey, IconKeyboard, IconLanguage, IconLayoutDashboard, IconPlayerPause, IconRepeat,
	IconTable, IconTrendingUp, IconTruck, IconUserShare, IconUserX, IconRadio, IconCalendarTime, IconChartDots, IconShield, IconUsersGroup
} from '@tabler/icons-svelte';
import { m } from '$lib/paraglide/messages.js';
import type { Feature } from './feature';
import type { Icon } from '@tabler/icons-svelte';

/**
 * The home page's sections, grouped by what a group uses each part for.
 *
 * Every card's order here is its order in a four-column grid with dense
 * packing: a big card takes two columns and two rows, a wide one two
 * columns. Reordering changes the picture, so check the page after.
 */
/** `tint` names a color class from marketing.css; it colors the label, the icons and the highlights. */
export type HomeSection = { id: string; tint: string; icon: Icon; eyebrow: () => string; title: () => string; intro: () => string; features: Feature[] };

export const homeSections: HomeSection[] = [
	{
		id: 'dispatch', tint: 't-blue', icon: IconRadio, eyebrow: m.marketing_dispatch, title: m.marketing_dispatch_title, intro: m.marketing_dispatch_intro,
		features: [
			{ title: m.marketing_board_title, body: m.marketing_board_body, span: 'big', shot: { name: 'dispatch' },
				details: [m.marketing_board_d1, m.marketing_board_d2, m.marketing_board_d3] },
			{ title: m.marketing_solver_title, body: m.marketing_solver_body, icon: IconBolt,
				details: [m.marketing_solver_d1, m.marketing_solver_d2, m.marketing_solver_d3] },
			{ title: m.marketing_sync_title, body: m.marketing_sync_body, icon: IconCloudDataConnection,
				details: [m.marketing_sync_d1, m.marketing_sync_d2, m.marketing_sync_d3] },
			{ title: m.marketing_keys_title, body: m.marketing_keys_body, icon: IconKeyboard, visual: 'keys',
				details: [m.marketing_keys_d1, m.marketing_keys_d2, m.marketing_keys_d3] },
			{ title: m.marketing_tow_title, body: m.marketing_tow_body, icon: IconTruck,
				details: [m.marketing_tow_d1, m.marketing_tow_d2, m.marketing_tow_d3] },
			{ title: m.marketing_host_page_title, body: m.marketing_host_page_body, span: 'wide', shot: { name: 'host', width: 'max(440px, 108%)' },
				details: [m.marketing_host_d1, m.marketing_host_d2, m.marketing_host_d3] },
			{ title: m.marketing_solo_title, body: m.marketing_solo_body, span: 'wide', tone: 'accent',
				link: { href: '/tools/dispatch', label: m.marketing_try } }
		]
	},
	{
		id: 'shifts', tint: 't-green', icon: IconCalendarTime, eyebrow: m.marketing_shifts, title: m.marketing_shifts_title, intro: m.marketing_shifts_intro,
		features: [
			{ title: m.marketing_sheets_title, body: m.marketing_sheets_body, span: 'big', shot: { name: 'signups' },
				details: [m.marketing_sheets_d1, m.marketing_sheets_d2, m.marketing_sheets_d3] },
			{ title: m.marketing_recurring_title, body: m.marketing_recurring_body, icon: IconRepeat,
				details: [m.marketing_recurring_d1, m.marketing_recurring_d2, m.marketing_recurring_d3] },
			{ title: m.marketing_zone_title, body: m.marketing_zone_body, icon: IconClock,
				details: [m.marketing_zone_d1, m.marketing_zone_d2, m.marketing_zone_d3] },
			{ title: m.marketing_notify_title, body: m.marketing_notify_body, icon: IconBell,
				details: [m.marketing_notify_d1, m.marketing_notify_d2, m.marketing_notify_d3] },
			{ title: m.marketing_linked_title, body: m.marketing_linked_short, icon: IconBrandDiscord,
				details: [m.marketing_linked_d1, m.marketing_linked_d2, m.marketing_linked_d3] },
			{ title: m.marketing_shiftpage_title, body: m.marketing_shiftpage_body, span: 'wide', shot: { name: 'shift' },
				details: [m.marketing_shiftpage_d1, m.marketing_shiftpage_d2, m.marketing_shiftpage_d3] },
			{ title: m.marketing_cover_title, body: m.marketing_cover_body, span: 'wide', icon: IconUserShare,
				details: [m.marketing_cover_d1, m.marketing_cover_d2, m.marketing_cover_d3] }
		]
	},
	{
		id: 'activity', tint: 't-amber', icon: IconChartDots, eyebrow: m.marketing_activity, title: m.marketing_activity_title, intro: m.marketing_activity_intro,
		features: [
			{ title: m.marketing_points_title, body: m.marketing_points_body, span: 'wide', shot: { name: 'rank-points', side: 'bottom' },
				details: [m.marketing_points_d1, m.marketing_points_d2, m.marketing_points_d3] },
			{ title: m.marketing_sheet_title, body: m.marketing_sheet_body, icon: IconTable,
				details: [m.marketing_sheet_d1, m.marketing_sheet_d2, m.marketing_sheet_d3] },
			{ title: m.marketing_promote_title, body: m.marketing_promote_body, icon: IconTrendingUp,
				details: [m.marketing_promote_d1, m.marketing_promote_d2, m.marketing_promote_d3] },
			{ title: m.marketing_noshow_title, body: m.marketing_noshow_body, icon: IconUserX,
				details: [m.marketing_noshow_d1, m.marketing_noshow_d2, m.marketing_noshow_d3] },
			{ title: m.marketing_pause_title, body: m.marketing_pause_body, icon: IconPlayerPause,
				details: [m.marketing_pause_d1, m.marketing_pause_d2, m.marketing_pause_d3] },
			{ title: m.marketing_slots_title, body: m.marketing_slots_body, span: 'wide', shot: { name: 'rank-slots', side: 'bottom' },
				details: [m.marketing_slots_d1, m.marketing_slots_d2, m.marketing_slots_d3] }
		]
	},
	{
		id: 'ranks', tint: 't-violet', icon: IconShield, eyebrow: m.marketing_ranks, title: m.marketing_ranks_title, intro: m.marketing_ranks_intro,
		features: [
			{ title: m.marketing_grants_title, body: m.marketing_grants_body, span: 'big', shot: { name: 'ranks' },
				details: [m.marketing_grants_d1, m.marketing_grants_d2, m.marketing_grants_d3] },
			{ title: m.marketing_minute_title, stat: '60s',
				details: [m.marketing_minute_d1, m.marketing_minute_d2, m.marketing_minute_d3] },
			{ title: m.marketing_claim_title, body: m.marketing_claim_body, icon: IconAward,
				details: [m.marketing_claim_d1, m.marketing_claim_d2, m.marketing_claim_d3] },
			{ title: m.marketing_forms_title, body: m.marketing_forms_body, span: 'wide', shot: { name: 'app-form' },
				details: [m.marketing_forms_d1, m.marketing_forms_d2, m.marketing_forms_d3] },
			{ title: m.marketing_queue_title, body: m.marketing_queue_body, span: 'wide', shot: { name: 'app-queue' },
				details: [m.marketing_queue_d1, m.marketing_queue_d2, m.marketing_queue_d3] },
			{ title: m.marketing_audit_title, body: m.marketing_audit_body, icon: IconHistory,
				details: [m.marketing_audit_d1, m.marketing_audit_d2, m.marketing_audit_d3] },
			{ title: m.marketing_key_title, body: m.marketing_key_body, icon: IconKey,
				details: [m.marketing_key_d1, m.marketing_key_d2, m.marketing_key_d3] }
		]
	},
	{
		id: 'discord', tint: 't-blurple', icon: IconBrandDiscord, eyebrow: m.marketing_bot, title: m.marketing_bot_hero, intro: m.marketing_bot_intro,
		features: [
			{ title: m.marketing_bot_manifest_title, body: m.marketing_manifest_body, span: 'big', shot: { name: 'manifest', themed: false },
				details: [m.marketing_manifest_d1, m.marketing_manifest_d2, m.marketing_manifest_d3] },
			{ title: m.marketing_auto_title, body: m.marketing_auto_body, icon: IconCalendarEvent,
				details: [m.marketing_auto_d1, m.marketing_auto_d2, m.marketing_auto_d3] },
			{ title: m.marketing_bot_language_title, body: m.marketing_botlang_body, icon: IconLanguage,
				details: [m.marketing_botlang_d1, m.marketing_botlang_d2, m.marketing_botlang_d3] },
			{ title: m.marketing_bot_link, body: m.marketing_botcta_body, span: 'wide', tone: 'accent', icon: IconBrandDiscord,
				link: { href: '/bot', label: m.marketing_botcta_link } }
		]
	},
	{
		id: 'group', tint: 't-teal', icon: IconUsersGroup, eyebrow: m.marketing_group, title: m.marketing_more, intro: m.marketing_group_intro,
		features: [
			{ title: m.marketing_public_title, body: m.marketing_public_short, span: 'big', shot: { name: 'group' },
				details: [m.marketing_public_d1, m.marketing_public_d2, m.marketing_public_d3] },
			{ title: m.marketing_routes_title, body: m.marketing_routes_short, span: 'wide', shot: { name: 'routes' },
				details: [m.marketing_routes_d1, m.marketing_routes_d2, m.marketing_routes_d3] },
			{ title: m.marketing_stats_title, body: m.marketing_stats_body, span: 'wide', shot: { name: 'stats-routes' },
				details: [m.marketing_stats_d1, m.marketing_stats_d2, m.marketing_stats_d3] },
			{ title: m.marketing_language_title, body: m.marketing_language_short, icon: IconLanguage, visual: 'languages',
				details: [m.marketing_language_d1, m.marketing_language_d2, m.marketing_language_d3] },
			{ title: m.marketing_widgets_title, body: m.marketing_widgets_body, icon: IconLayoutDashboard,
				details: [m.marketing_widgets_d1, m.marketing_widgets_d2, m.marketing_widgets_d3] },
			{ title: m.marketing_api_title, body: m.marketing_api_body, icon: IconCode,
				details: [m.marketing_api_d1, m.marketing_api_d2, m.marketing_api_d3] },
			{ title: m.marketing_stage_title, body: m.marketing_stage_body, icon: IconBulb, link: { href: '/tools/stage', label: m.marketing_tools_link },
				details: [m.marketing_stage_d1, m.marketing_stage_d2, m.marketing_stage_d3] }
		]
	}
];
