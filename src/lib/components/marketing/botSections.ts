import {
	IconBroadcast, IconChartBar, IconHash, IconLanguage, IconLink, IconLock, IconPlugConnected, IconRefresh,
	IconSettings, IconTrash, IconTruck, IconUserCheck
} from '@tabler/icons-svelte';
import { m } from '$lib/paraglide/messages.js';
import type { HomeSection } from './homeSections';

/** The /bot page's sections. Same packing rules as the home page's. */
export const botSections: HomeSection[] = [
	{
		id: 'automation', eyebrow: m.marketing_bot_automation_title, title: m.marketing_bot_timeline, intro: m.marketing_bot_timeline_body,
		features: [
			{ title: m.marketing_bot_announce, body: m.marketing_bot_announce_body, chip: '01 · /announce',
				details: [m.marketing_bot_announce_d1, m.marketing_bot_announce_d2, m.marketing_bot_announce_d3] },
			{ title: m.marketing_bot_signup, body: m.marketing_bot_signup_body, chip: '02 · /signups',
				details: [m.marketing_bot_signup_d1, m.marketing_bot_signup_d2, m.marketing_bot_signup_d3] },
			{ title: m.marketing_bot_staff, body: m.marketing_bot_staff_body, chip: '03 · /staff-begin',
				details: [m.marketing_bot_staff_d1, m.marketing_bot_staff_d2, m.marketing_bot_staff_d3] },
			{ title: m.marketing_bot_begin, body: m.marketing_bot_begin_body, chip: '04 · /begin',
				details: [m.marketing_bot_begin_d1, m.marketing_bot_begin_d2, m.marketing_bot_begin_d3] },
			{ title: m.marketing_bot_complete, body: m.marketing_bot_complete_body, chip: '05 · /complete',
				details: [m.marketing_bot_complete_d1, m.marketing_bot_complete_d2, m.marketing_bot_complete_d3] },
			{ title: m.marketing_bot_host_title, body: m.marketing_bot_host_body, span: 'wide', shot: { name: 'host' },
				details: [m.marketing_bot_host_d1, m.marketing_bot_host_d2, m.marketing_bot_host_d3] },
			{ title: m.marketing_bot_commands, visual: 'commands' }
		]
	},
	{
		id: 'signups', eyebrow: m.marketing_shifts, title: m.marketing_bot_identity_title, intro: m.marketing_bot_identity_body,
		features: [
			{ title: m.marketing_bot_sheets_title, body: m.marketing_bot_sheets_body, span: 'big', shot: { name: 'signups' },
				details: [m.marketing_bot_sheets_d1, m.marketing_bot_sheets_d2, m.marketing_bot_sheets_d3] },
			{ title: m.marketing_bot_link_title, body: m.marketing_bot_link_body, icon: IconLink,
				details: [m.marketing_linked_d1, m.marketing_linked_d2, m.marketing_bot_link_d3] },
			{ title: m.marketing_bot_channel_title, body: m.marketing_bot_identity_note, icon: IconLock,
				details: [m.marketing_bot_channel_d1, m.marketing_bot_channel_d2, m.marketing_bot_channel_d3] },
			{ title: m.marketing_bot_require_title, body: m.marketing_bot_require_body, icon: IconUserCheck,
				details: [m.marketing_bot_require_d1, m.marketing_bot_require_d2, m.marketing_bot_require_d3] },
			{ title: m.marketing_bot_move_title, body: m.marketing_bot_move_body, icon: IconRefresh }
		]
	},
	{
		id: 'board', eyebrow: m.marketing_dispatch, title: m.marketing_bot_board_title, intro: m.marketing_bot_board_body,
		features: [
			{ title: m.marketing_bot_manifest_title, body: m.marketing_manifest_body, span: 'big', shot: { name: 'manifest', themed: false },
				details: [m.marketing_manifest_d1, m.marketing_manifest_d2, m.marketing_manifest_d3] },
			{ title: m.marketing_bot_refresh_title, body: m.marketing_bot_refresh_body, icon: IconRefresh,
				details: [m.marketing_bot_refresh_d1, m.marketing_bot_refresh_d2, m.marketing_bot_refresh_d3] },
			{ title: m.marketing_bot_counts_title, body: m.marketing_bot_counts_body, icon: IconChartBar,
				details: [m.marketing_bot_counts_d1, m.marketing_bot_counts_d2, m.marketing_bot_counts_d3] },
			{ title: m.marketing_tow_title, body: m.marketing_tow_body, icon: IconTruck,
				details: [m.marketing_tow_d1, m.marketing_tow_d2, m.marketing_tow_d3] },
			{ title: m.marketing_bot_numbers_title, body: m.marketing_bot_numbers_body, icon: IconHash }
		]
	},
	{
		id: 'languages', eyebrow: m.marketing_languages, title: m.marketing_bot_language_title, intro: m.marketing_bot_language_body,
		features: [
			{ title: m.marketing_bot_lang_demo, span: 'wide', visual: 'stack' },
			{ title: m.marketing_bot_cmdlang_title, body: m.marketing_bot_cmdlang_body, icon: IconLanguage,
				details: [m.marketing_botlang_d1, m.marketing_botlang_d2, m.marketing_botlang_d3] },
			{ title: m.marketing_bot_fineprint_title, body: m.marketing_bot_language_note, icon: IconBroadcast }
		]
	},
	{
		id: 'server', eyebrow: m.marketing_bot_server, title: m.marketing_bot_controls, intro: m.marketing_bot_server_intro,
		features: [
			{ title: m.marketing_bot_channels_title, body: m.marketing_bot_channels_body, icon: IconHash,
				details: [m.marketing_bot_channels_d1, m.marketing_bot_channels_d2, m.marketing_bot_channels_d3] },
			{ title: m.marketing_bot_automation_title, body: m.marketing_bot_automation_body, icon: IconSettings,
				details: [m.marketing_bot_automation_d1, m.marketing_bot_automation_d2, m.marketing_bot_automation_d3] },
			{ title: m.marketing_bot_health_title, body: m.marketing_bot_health_body, icon: IconPlugConnected,
				details: [m.marketing_bot_health_d1, m.marketing_bot_health_d2, m.marketing_bot_health_d3] },
			{ title: m.marketing_bot_cleanup_title, body: m.marketing_bot_cleanup_body, icon: IconTrash,
				details: [m.marketing_bot_cleanup_d1, m.marketing_bot_cleanup_d2, m.marketing_bot_cleanup_d3] }
		]
	},
	{
		id: 'setup', eyebrow: m.marketing_bot_setup, title: m.marketing_bot_setup_title, intro: m.marketing_bot_hint,
		features: [
			{ title: m.marketing_bot_step1, body: m.marketing_bot_step1_body, chip: '01' },
			{ title: m.marketing_bot_step2, body: m.marketing_bot_step2_body, chip: '02' },
			{ title: m.marketing_bot_step3, body: m.marketing_bot_step3_body, chip: '03' },
			{ title: m.marketing_bot_cta_title, body: m.marketing_bot_cta_body, tone: 'accent', link: { href: '/dashboard?setup=bot', label: m.marketing_bot_start } }
		]
	}
];
