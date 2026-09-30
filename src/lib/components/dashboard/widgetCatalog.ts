import { IconCalendarClock, IconCalendarTime, IconCalendarWeek, IconClock, IconTool, IconUserCircle, IconUsers, IconHeart, IconThumbDown, IconBell, IconChartBar, IconClipboardList, IconRadio, IconPin, IconLayoutDashboard } from '@tabler/icons-svelte';
import { m } from '$lib/paraglide/messages.js';
import type { HomeLayout } from '$lib/api/types';
export function widgetCatalog(mode: 'user' | 'host') {
    const common = [
        { id: 'next', icon: IconCalendarClock, name: m.widget_next(), description: m.widget_next_description(), width: 2 },
        { id: 'shifts', icon: IconCalendarTime, name: m.widget_shifts(), description: m.widget_shifts_description(), width: 1 },
        { id: 'today', icon: IconCalendarTime, name: m.widget_today(), description: m.widget_today_description(), width: 1 },
        { id: 'week', icon: IconCalendarWeek, name: m.widget_week(), description: m.widget_week_description(), width: 2 },
        { id: 'tools', icon: IconTool, name: m.widget_tools(), description: m.widget_tools_description(), width: 1 },
        { id: 'account', icon: IconUserCircle, name: m.widget_account(), description: m.widget_account_description(), width: 1 },
        { id: 'clock', icon: IconClock, name: m.widget_clock(), description: m.widget_clock_description(), width: 1 }
    ];
    return [...common, ...(mode === 'user' ? [
        { id: 'my-shifts', icon: IconCalendarClock, name: m.widget_my_shifts(), description: m.widget_my_shifts_description(), width: 1 },
        { id: 'following', icon: IconUsers, name: m.widget_following(), description: m.widget_following_description(), width: 2 },
        { id: 'favorites', icon: IconHeart, name: m.widget_favorites(), description: m.widget_favorites_description(), width: 1 },
        { id: 'disliked', icon: IconThumbDown, name: m.widget_disliked(), description: m.widget_disliked_description(), width: 1 },
        { id: 'reminders', icon: IconBell, name: m.widget_reminders(), description: m.widget_reminders_description(), width: 1 }
    ] : [
        { id: 'summary', icon: IconChartBar, name: m.widget_summary(), description: m.widget_summary_description(), width: 1 },
        { id: 'groups', icon: IconUsers, name: m.widget_groups(), description: m.widget_groups_description(), width: 2 },
        { id: 'reviews', icon: IconClipboardList, name: m.widget_reviews(), description: m.widget_reviews_description(), width: 2 },
        { id: 'live-rooms', icon: IconRadio, name: m.widget_live_rooms(), description: m.widget_live_rooms_description(), width: 1 },
        { id: 'host-tools', icon: IconLayoutDashboard, name: m.widget_host_tools(), description: m.widget_host_tools_description(), width: 2 },
        { id: 'primary', icon: IconPin, name: m.widget_primary(), description: m.widget_primary_description(), width: 1 }
    ])];
}
export const defaultLayouts: HomeLayout = {
    user: [{ id: 'next', width: 2 }, { id: 'my-shifts', width: 1 }, { id: 'following', width: 2 }, { id: 'shifts', width: 1 }, { id: 'favorites', width: 1 }, { id: 'tools', width: 1 }],
    host: [{ id: 'next', width: 2 }, { id: 'summary', width: 1 }, { id: 'reviews', width: 2 }, { id: 'live-rooms', width: 1 }, { id: 'groups', width: 2 }, { id: 'shifts', width: 1 }]
};
