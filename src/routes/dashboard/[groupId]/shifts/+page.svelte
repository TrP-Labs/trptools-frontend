<script lang="ts">
    import { IconCalendarTime, IconHistory } from '@tabler/icons-svelte';
    import ObjectPage from '$lib/components/layout/ObjectPage.svelte';
    import EmptyState from '$lib/components/ui/EmptyState.svelte';
    import Badge from '$lib/components/ui/Badge.svelte';
    import Button from '$lib/components/ui/Button.svelte';
    import { formatDateTime } from '$lib/utils/format';
    import { m } from '$lib/paraglide/messages.js';
    import type { PageProps } from './$types';
    let { data }: PageProps = $props();
    const sections = $derived([{ id: 'future', label: m.shifts_future(), icon: IconCalendarTime }, { id: 'past', label: m.shifts_past(), icon: IconHistory }]);
</script>
<ObjectPage title={m.common_shifts()} description={m.shifts_instances_description()} {sections}>
    {#snippet actions()}<Button variant="secondary" href="/dashboard/{data.group.slug}/schedule">{m.shifts_schedule()}</Button>{/snippet}
    {#snippet children(section)}
        {#if !data.shifts.length}<EmptyState title={m.shifts_instances_empty()} />
        {:else}<ul class="space-y-3">
            {#each data.shifts as shift (shift.id)}
                <li class="min-w-0"><a class="card flex flex-wrap items-center gap-3 p-4 hover:border-accent/50" href="/dashboard/{data.group.slug}/shifts/{shift.id}">
                    <span class="h-9 w-1 shrink-0 rounded-full" style="background: {shift.color}"></span>
                    <div class="min-w-0 flex-1"><p class="font-medium wrap-anywhere">{shift.name}</p><p class="text-sm text-text-muted">{formatDateTime(shift.start)}</p></div>
                    {#if shift.decision === 'CANCELED'}<Badge tone="danger">{m.shifts_canceled()}</Badge>{:else if shift.decision === 'FAILED'}<Badge tone="danger">{m.shifts_demand_failed()}</Badge>{:else if shift.decision === 'PENDING'}<Badge>{m.shifts_demand_pending()}</Badge>{/if}
                </a></li>
            {/each}
        </ul>{/if}
        {#if section === 'past' && data.shifts.length}
            <Button class="mt-5" variant="secondary" href="?section=past&before={encodeURIComponent(new Date(data.shifts[data.shifts.length - 1].start).toISOString())}">{m.shifts_older()}</Button>
        {/if}
    {/snippet}
</ObjectPage>
