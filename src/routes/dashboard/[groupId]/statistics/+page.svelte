<script lang="ts">
    import { IconEye, IconLink, IconUsers, IconBell } from '@tabler/icons-svelte';
    import PageHeader from '$lib/components/ui/PageHeader.svelte';
    import Card from '$lib/components/ui/Card.svelte';
    import Button from '$lib/components/ui/Button.svelte';
    import RouteBadge from '$lib/components/routes/RouteBadge.svelte';
    import { formatNumber, formatDateTime } from '$lib/utils/format';
    import { m } from '$lib/paraglide/messages.js';
    import type { PageProps } from './$types';
    import type { RouteShape } from '$lib/api/types';
    let { data }: PageProps = $props();
    let stats = $derived(data.statistics);
    // Eden revives ISO calendar dates as Date objects, even for a string schema.
    // Keep chart labels in UTC instead of rendering Date.toString() in the viewer's zone.
    function calendarDay(value: string | Date) { return value instanceof Date ? value.toISOString().slice(0, 10) : String(value).slice(0, 10); }
    let maximum = $derived(Math.max(1, ...stats.daily.map(day => day.groupViews)));
    let tiles = $derived([
        { label: m.statistics_group_views(), value: stats.totals.groupViews, previous: stats.previous.groupViews, icon: IconEye },
        { label: m.statistics_join_clicks(), value: stats.totals.robloxClicks + stats.totals.discordClicks, previous: stats.previous.robloxClicks + stats.previous.discordClicks, icon: IconLink },
        { label: m.statistics_followers(), value: stats.followers, previous: null, icon: IconUsers },
        { label: m.statistics_reminders(), value: stats.reminderSubscribers, previous: null, icon: IconBell }
    ]);
    let links = $derived([
        { name: 'Roblox', views: stats.totals.robloxViews, clicks: stats.totals.robloxClicks },
        { name: 'Discord', views: stats.totals.discordViews, clicks: stats.totals.discordClicks }
    ]);
</script>
<PageHeader title={m.statistics_title()} description={m.statistics_description()} />
<div class="space-y-6">
    <div class="flex flex-wrap items-center justify-between gap-3">
        <p class="text-xs text-text-muted">{stats.updatedAt ? m.statistics_updated({ when: formatDateTime(stats.updatedAt) }) : m.statistics_waiting()}</p>
        <div class="flex gap-2">{#each [7, 30, 90] as days}<Button size="sm" variant={stats.days === days ? 'primary' : 'secondary'} href="?days={days}">{m.statistics_days({ days })}</Button>{/each}</div>
    </div>
    <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{#each tiles as tile}<div class="card min-w-0 p-4"><div class="mb-3 flex items-center gap-2 text-text-muted"><tile.icon size={17} /><p class="text-xs">{tile.label}</p></div><p class="text-2xl font-semibold text-text tabular-nums">{formatNumber(tile.value)}</p>{#if tile.previous !== null}<p class="mt-1 text-xs text-text-subtle">{m.statistics_previous({ count: formatNumber(tile.previous) })}</p>{/if}</div>{/each}</div>
    <Card title={m.statistics_traffic()} description={m.statistics_traffic_description()}>
        <div class="flex h-36 items-end gap-0.5 overflow-hidden" role="img" aria-label={m.statistics_traffic_label({ days: stats.days, count: stats.totals.groupViews })}>{#each stats.daily as day}<div class="min-w-0 flex-1 rounded-t bg-accent/70 transition-colors hover:bg-accent" style:height="{Math.max(2, day.groupViews / maximum * 100)}%" title="{calendarDay(day.day)}: {day.groupViews}"></div>{/each}</div>
        <div class="mt-2 flex justify-between text-xs text-text-subtle"><span>{calendarDay(stats.daily[0].day)}</span><span>{calendarDay(stats.daily.at(-1)?.day ?? '')}</span></div>
        <div class="mt-5 grid grid-cols-3 gap-3 border-t border-border-base pt-4">{#each [{ label: m.common_routes(), count: stats.totals.routeViews }, { label: m.common_depots(), count: stats.totals.depotViews }, { label: m.common_shifts(), count: stats.totals.shiftViews }] as item}<div><p class="text-lg font-semibold text-text">{formatNumber(item.count)}</p><p class="text-xs text-text-muted">{item.label}</p></div>{/each}</div>
    </Card>
    <Card title={m.statistics_links()} description={m.statistics_links_description()}>
        <div class="space-y-4">{#each links as link}<div class="grid grid-cols-2 items-center gap-3 rounded-lg bg-background-secondary p-4 sm:grid-cols-4"><p class="font-medium text-text">{link.name}</p><div><p class="text-lg font-semibold text-text">{formatNumber(link.views)}</p><p class="text-xs text-text-muted">{m.statistics_confirmations()}</p></div><div><p class="text-lg font-semibold text-text">{formatNumber(link.clicks)}</p><p class="text-xs text-text-muted">{m.statistics_clicks()}</p></div><div><p class="text-lg font-semibold text-accent">{link.views ? (100 * link.clicks / link.views).toFixed(1) + '%' : '—'}</p><p class="text-xs text-text-muted">{m.statistics_ctr()}</p></div></div>{/each}</div>
        <p class="mt-4 text-xs text-text-subtle">{m.statistics_ctr_note()}</p>
    </Card>
    <Card title={m.statistics_routes()} description={m.statistics_routes_description()}>
        <div class="space-y-4">{#each stats.routes as route}<div class="flex flex-wrap items-center gap-3 border-b border-border-base pb-4 last:border-0 last:pb-0"><RouteBadge label={route.name} color={route.color} shape={route.shape as RouteShape} /><div class="min-w-0 flex-1"><p class="text-sm text-text">{route.favoritePercent === null ? m.statistics_small_sample() : m.statistics_route_score({ percent: route.favoritePercent, votes: route.votes })}</p><p class="text-xs text-text-muted">{route.builtIn ? m.statistics_global_votes() : m.statistics_group_votes()} · {m.statistics_route_views({ count: formatNumber(route.views) })}</p>{#if route.favoritePercent !== null}<div class="mt-2 h-1.5 overflow-hidden rounded-full bg-danger/30"><div class="h-full bg-success" style:width="{route.favoritePercent}%"></div></div>{/if}</div>{#if route.favorites !== null}<p class="text-xs text-text-muted">{m.statistics_votes_detail({ favorites: route.favorites, dislikes: route.dislikes ?? 0 })}</p>{/if}</div>{/each}{#if !stats.routes.length}<p class="text-sm text-text-muted">{m.statistics_no_routes()}</p>{/if}</div>
    </Card>
    <p class="text-xs leading-relaxed text-text-subtle">{m.statistics_privacy_note()}</p>
</div>
