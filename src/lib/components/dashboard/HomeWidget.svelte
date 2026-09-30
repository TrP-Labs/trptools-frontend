<script lang="ts">
    import { onMount } from 'svelte';
    import Card from '$lib/components/ui/Card.svelte';
    import Button from '$lib/components/ui/Button.svelte';
    import Avatar from '$lib/components/users/Avatar.svelte';
    import RouteBadge from '$lib/components/routes/RouteBadge.svelte';
    import NextShiftCard from './NextShiftCard.svelte';
    import ShiftList from './ShiftList.svelte';
    import ReviewQueue from './ReviewQueue.svelte';
    import GroupStatusCard from './GroupStatusCard.svelte';
    import { calendarKey, formatDate, formatTime } from '$lib/utils/format';
    import { getLocale } from '$lib/paraglide/runtime.js';
    import { pushSupported } from '$lib/utils/push';
    import { IconArrowRight, IconBell, IconBellCheck, IconCalendarTime, IconTool, IconSettings, type Icon as WidgetIcon } from '@tabler/icons-svelte';
    import { localized } from '$lib/utils/translations';
    import { can, PERM } from '$lib/utils/permissions';
    import { m } from '$lib/paraglide/messages.js';
    import type { DashboardData, SessionUser } from '$lib/api/types';
    let { id, title, icon: Icon, dashboard, user, pinning, onpin }: {
        id: string; title: string; dashboard: DashboardData; user: SessionUser;
        icon: WidgetIcon;
        pinning: string | null; onpin: (id: string) => void;
    } = $props();
    let groups = $derived(dashboard.groups);
    let shifts = $derived(dashboard.shifts);
    let own = $derived(dashboard.signedUpShifts);
    let live = $derived(groups.filter((group) => group.roomId && can(group.permissions, PERM.DISPATCH)));
    let waiting = $derived(dashboard.reviews.reduce((sum, review) => sum + review.pendingCount, 0));
    let primary = $derived(groups.find((group) => group.id === dashboard.primaryGroupId));
    let now = $state(new Date());
    let selectedDay = $state('');
    let deviceActive = $state(false);
    let ready = $state(false);
    onMount(() => {
        ready = true;
        if (id === 'reminders' && pushSupported()) {
            void navigator.serviceWorker.getRegistration('/').then(async worker => {
                deviceActive = Boolean(await worker?.pushManager.getSubscription()) && localStorage.getItem('trptools:push-account') === user.userId;
            }).catch(() => { deviceActive = false; });
        }
        if (!['clock', 'today', 'week'].includes(id)) return;
        const timer = setInterval(() => { now = new Date(); }, id === 'clock' ? 1000 : 60_000);
        return () => clearInterval(timer);
    });
    let datedShifts = $derived(shifts.map(shift => ({ shift, day: calendarKey(shift.start) })));
    let today = $derived(datedShifts.filter(item => item.day === calendarKey(now)).map(item => item.shift));
    let dayCounts = $derived.by(() => { const counts = new Map<string, number>(); for (const item of datedShifts) counts.set(item.day, (counts.get(item.day) ?? 0) + 1); return counts; });
    let weekdayFormatter = $derived(new Intl.DateTimeFormat(getLocale(), { weekday: 'short', timeZone: 'UTC' }));
    let days = $derived(Array.from({ length: 7 }, (_, index) => {
        // Use calendar dates, not 24-hour jumps around DST or a server's zone.
        const date = new Date(calendarKey(now) + 'T12:00:00Z');
        date.setUTCDate(date.getUTCDate() + index);
        const key = date.toISOString().slice(0, 10);
        return { key, label: formatDate(date, 'UTC'), number: date.getUTCDate(), weekday: weekdayFormatter.format(date), count: dayCounts.get(key) ?? 0 };
    }));
    let chosenDay = $derived(days.find(day => day.key === selectedDay) ?? days[0]);
    let dayShifts = $derived(datedShifts.filter(item => item.day === chosenDay.key).map(item => item.shift));
    let preference = $derived(dashboard.routePreferences.filter((route) => route.preference === (id === 'disliked' ? 'DISLIKE' : 'FAVORITE')));
    let listed = $derived(id === 'my-shifts' ? own : id === 'today' ? today : shifts);
</script>

{#snippet empty(text: string, href?: string, label?: string)}
    <p class="text-sm leading-relaxed text-text-muted">{text}</p>
    {#if href}<a {href} class="mt-3 inline-flex text-sm font-medium text-accent hover:underline">{label}</a>{/if}
{/snippet}

{#if id === 'next'}
    <NextShiftCard {shifts} mode={dashboard.mode} rooms={Object.fromEntries(groups.map((group) => [group.id, can(group.permissions, PERM.DISPATCH) ? group.roomId : null]))} />
{:else}
    <Card {title}>
        {#snippet icon()}<Icon size={18} stroke={1.7} />{/snippet}
        {#if id === 'my-shifts' || id === 'shifts' || id === 'today'}
            {#if listed.length}<ShiftList shifts={listed.slice(0, 3)} />
            {:else}{@render empty(id === 'my-shifts' ? m.widget_no_signups() : id === 'today' ? m.widget_day_empty() : dashboard.mode === 'host' ? m.widget_host_shifts_empty() : m.widget_no_shifts(), dashboard.mode === 'host' ? '/dashboard' : groups.length ? '/shifts' : '/groups', dashboard.mode === 'host' ? m.home_all_groups() : groups.length ? m.home_all_shifts() : m.shifts_browse_groups())}{/if}
            {#if listed.length}<a href={dashboard.mode === 'host' ? '/dashboard' : id === 'my-shifts' ? '/shifts?signedUp=1' : '/shifts'} class="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:underline">{dashboard.mode === 'host' ? m.home_all_groups() : m.home_all_shifts()}<IconArrowRight size={15} /></a>{/if}
        {:else if id === 'following'}
            {#if groups.length}
                <ul class="grid gap-3 @lg:grid-cols-2">
                    {#each groups.slice(0, 6) as group (group.id)}
                        <li class="min-w-0"><a href="/g/{group.slug}" class="flex items-center gap-3 rounded-lg border border-border-base p-3 transition-colors hover:bg-background-secondary">
                            <Avatar src={group.icon} name={group.name} size={32} />
                            <div class="min-w-0"><p class="truncate text-sm font-medium">{localized(group, 'name')}</p><p class="truncate text-xs text-text-muted">{localized(group, 'tagline') || m.follow_following()}</p></div>
                        </a></li>
                    {/each}
                </ul>
            {:else}{@render empty(m.follow_empty(), '/groups', m.shifts_browse_groups())}{/if}
            {#if dashboard.groupTotal > groups.length}<p class="mt-3 text-xs text-text-muted">{m.widget_groups_limit({ count: dashboard.groupTotal })}</p>{/if}
            <a href="/groups" class="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:underline">{m.widget_all_groups()}<IconArrowRight size={15} /></a>
        {:else if id === 'groups'}
            {#if groups.length}<div class="space-y-4">{#each groups.slice(0, 4) as group (group.id)}<GroupStatusCard {group} embedded primary={group.id === dashboard.primaryGroupId} {pinning} {onpin} />{/each}</div><a href="/dashboard" class="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:underline">{m.home_all_groups()}<IconArrowRight size={15} /></a>
            {:else}{@render empty(m.widget_no_host_groups(), '/dashboard', m.home_all_groups())}{/if}
        {:else if id === 'reviews'}
            {#if dashboard.reviews.length}<ReviewQueue reviews={dashboard.reviews.slice(0, 5)} />{:else}{@render empty(m.widget_no_reviews())}{/if}
        {:else if id === 'summary'}
            <dl class="grid grid-cols-2 gap-4">
                {#each [{ label: m.home_groups(), value: dashboard.groupTotal }, { label: m.widget_shifts(), value: shifts.length }, { label: m.widget_reviews(), value: waiting }, { label: m.widget_live_rooms(), value: live.length }] as item}
                    <div class="min-w-0"><dd class="text-2xl font-semibold tabular-nums">{item.value}</dd><dt class="text-xs text-text-muted">{item.label}</dt></div>
                {/each}
            </dl>
        {:else if id === 'live-rooms'}
            {#if live.length}<ul class="space-y-2">{#each live as group (group.id)}<li><a href="/dashboard/{group.slug}/dispatch" class="flex min-w-0 items-center gap-2 rounded-lg bg-success/10 p-3 text-sm text-success"><span class="size-2 shrink-0 rounded-full bg-success"></span><span class="truncate">{localized(group, 'name')}</span></a></li>{/each}</ul>
            {:else}{@render empty(m.widget_no_rooms())}{/if}
        {:else if id === 'week'}
            <ul class="grid grid-cols-4 gap-2 @lg:grid-cols-7">
                {#each days as day}<li class="min-w-0"><button type="button" disabled={!ready} aria-label={m.widget_week_day({ date: day.label })} aria-pressed={chosenDay.key === day.key} onclick={() => { selectedDay = day.key; }} class="w-full rounded-lg border px-1 py-3 text-center transition-colors {chosenDay.key === day.key ? 'border-accent/50 bg-accent/10' : 'border-border-base hover:border-accent/50'}"><span class="block text-xs text-text-muted">{day.weekday}</span><span class="mt-1 block text-lg font-semibold tabular-nums">{day.number}</span><span class="mt-2 block text-xs {day.count ? 'text-accent' : 'text-text-subtle'}">{day.count}</span></button></li>{/each}
            </ul>
            <div class="mt-4 border-t border-border-base pt-4" aria-live="polite"><p class="mb-3 text-sm font-medium">{chosenDay.label}</p>{#if dayShifts.length}<ShiftList shifts={dayShifts.slice(0, 5)} />{:else}{@render empty(m.widget_day_empty())}{/if}</div>
        {:else if id === 'favorites' || id === 'disliked'}
            {#if preference.length}<ul class="flex flex-wrap gap-2">{#each preference as route (route.routeId ?? route.name)}<li class="min-w-0"><RouteBadge label={localized(route, 'name')} color={route.color} size="md" /></li>{/each}</ul>
            {:else}{@render empty(m.widget_no_preferences(), '/groups', m.shifts_browse_groups())}{/if}
            {#if preference.length}<a href="/tools/dispatch" class="mt-4 inline-flex items-center gap-1.5 text-sm text-accent hover:underline">{m.widget_routes_dispatch()}<IconArrowRight size={15} /></a>{/if}
        {:else if id === 'primary'}
            {#if primary}<GroupStatusCard group={primary} embedded primary {pinning} {onpin} />{:else}{@render empty(m.widget_pin_hint(), '/dashboard', m.home_all_groups())}{/if}
        {:else if id === 'host-tools'}
            {#if groups.length}<ul class="space-y-4">{#each groups as group (group.id)}<li class="min-w-0"><p class="mb-2 truncate text-sm font-medium">{localized(group, 'name')}</p><div class="flex flex-wrap gap-2">
                {#if can(group.permissions, PERM.VIEW_DASHBOARD)}<Button size="sm" variant="secondary" href="/dashboard/{group.slug}">{m.widget_overview()}</Button>{/if}
                {#if can(group.permissions, PERM.MANAGE_SHIFTS)}<Button size="sm" variant="secondary" href="/dashboard/{group.slug}/shifts">{m.common_shifts()}</Button>{/if}
                {#if can(group.permissions, PERM.START_ROOM)}<Button size="sm" variant="secondary" href="/dashboard/{group.slug}/host">{m.widget_host_console()}</Button>{/if}
                {#if can(group.permissions, PERM.MANAGE_SIGNUPS)}<Button size="sm" variant="secondary" href="/dashboard/{group.slug}/signups">{m.common_signups()}</Button>{/if}
            </div></li>{/each}</ul>{:else}{@render empty(m.widget_no_host_groups())}{/if}
        {:else if id === 'tools'}
            <div class="grid gap-2"><Button variant="secondary" href="/tools/dispatch"><IconCalendarTime size={17} />{m.widget_solo_dispatch()}</Button><Button variant="secondary" href="/tools/stage"><IconTool size={17} />{m.widget_stage_programmer()}</Button><Button variant="ghost" href="/groups">{m.shifts_browse_groups()}</Button></div>
        {:else if id === 'account'}
            <div class="mb-4 flex min-w-0 items-center gap-3"><Avatar src={user.avatar} name={user.displayName ?? user.username ?? ''} size={40} /><div class="min-w-0"><p class="truncate font-medium">{user.displayName ?? user.username}</p><p class="text-xs text-text-muted">{user.discord ? m.widget_discord_connected() : m.widget_discord_not_connected()}</p></div></div>
            <div class="flex flex-wrap gap-2"><Button size="sm" variant="secondary" href="/settings">{m.common_settings()}</Button><Button size="sm" variant="secondary" href="/users/{user.userId}">{m.widget_my_profile()}</Button></div>
        {:else if id === 'clock'}
            <p class="font-mono text-4xl font-semibold tabular-nums">{formatTime(now)}</p><p class="mt-2 text-sm text-text-muted">{formatDate(now)}</p><a href="/settings/appearance" class="mt-4 inline-flex text-xs text-accent hover:underline">{m.widget_change_timezone()}</a>
        {:else if id === 'reminders'}
            <div class="flex items-start gap-3 rounded-lg bg-background-secondary p-3">{#if deviceActive}<IconBellCheck size={20} class="shrink-0 text-success" />{:else}<IconBell size={20} class="shrink-0 text-text-muted" />{/if}<p class="text-sm text-text-muted">{deviceActive ? m.widget_browser_active() : m.widget_browser_inactive()}</p></div>
            <Button variant="secondary" href="/settings/notifications" class="mt-4"><IconSettings size={16} />{m.widget_notification_settings()}</Button>
            {#if groups.length}<ul class="mt-4 space-y-2">{#each groups.slice(0, 3) as group (group.id)}<li><a href="/g/{group.slug}" class="flex items-center justify-between gap-2 rounded-lg px-1 py-2 text-sm text-text-muted hover:text-accent"><span class="truncate">{localized(group, 'name')}</span><IconArrowRight size={15} class="shrink-0" /></a></li>{/each}</ul>{/if}
        {/if}
    </Card>
{/if}
