<script lang="ts">
    import { afterNavigate } from '$app/navigation';
    import { announceDiscordResult } from '$lib/utils/discordLink';
    import { refreshData } from '$lib/utils/refresh';
    import ShiftDetails from '$lib/components/shifts/ShiftDetails.svelte';
    import { formatDateTime } from '$lib/utils/format';
    import { localized } from '$lib/utils/translations';
    import { withAlpha } from '$lib/utils/color';
    import { m } from '$lib/paraglide/messages.js';
    import type { PageProps } from './$types';
    let { data }: PageProps = $props();
    afterNavigate(() => announceDiscordResult(() => void refreshData()));
</script>
<svelte:head><title>{localized(data.shift, 'name')} — {formatDateTime(data.shift.start)} — TrPTools</title><meta name="description" content={localized(data.shift, 'description')} /></svelte:head>
<section class="border-b border-border-base" style="background: linear-gradient(180deg, {withAlpha(data.shift.color, 0.18)}, transparent)">
    <div class="mx-auto max-w-4xl space-y-4 px-4 py-8">
        <a href="/g/{data.groupSlug}" class="text-sm text-text-muted hover:text-text">← {data.groupSlug}</a>
        <h1 class="text-3xl font-semibold wrap-anywhere">{localized(data.shift, 'name')}</h1>
        <p class="text-sm text-text-muted">{formatDateTime(data.shift.start)} — {formatDateTime(data.shift.end)}</p>
        {#if data.shift.canManage}<a href="/dashboard/{data.groupSlug}/shifts/{data.shift.id}" class="text-sm text-accent">{m.dashboard_shifts_edit()}</a>{/if}
    </div>
</section>
<div class="mx-auto max-w-4xl px-4 py-8"><ShiftDetails shift={data.shift} user={data.user} /></div>
