<script lang="ts">
    import PageHeader from '$lib/components/ui/PageHeader.svelte';
    import Button from '$lib/components/ui/Button.svelte';
    import EmptyState from '$lib/components/ui/EmptyState.svelte';
    import Badge from '$lib/components/ui/Badge.svelte';
    import { m } from '$lib/paraglide/messages.js';
    import { localized } from '$lib/utils/translations';
    import type { PageProps } from './$types';
    let { data }: PageProps = $props();
</script>
<PageHeader title={m.shifts_schedule()} description={m.shifts_schedule_description()}>
    {#snippet actions()}<Button href="/dashboard/{data.group.slug}/schedule/new" disabled={data.schedules.length >= 100}>{m.shifts_rule_new()}</Button>{/snippet}
</PageHeader>
{#if !data.schedules.length}<EmptyState title={m.shifts_rule_empty()} description={m.shifts_schedule_description()} />
{:else}<ul class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
    {#each data.schedules as shift (shift.eventId)}
        <li class="min-w-0"><a href="/dashboard/{data.group.slug}/schedule/{shift.eventId}" class="card flex h-full gap-3 p-5 transition-colors hover:border-accent/50">
            <span class="w-1 shrink-0 rounded-full" style="background: {shift.color}"></span>
            <div class="min-w-0"><p class="font-medium wrap-anywhere">{localized(shift, 'name')}</p><p class="mt-1 text-sm text-text-muted">{shift.recurrenceText}</p>
            {#if shift.onDemand}<div class="mt-2"><Badge>{m.shifts_rule_demand()}</Badge></div>{/if}</div>
        </a></li>
    {/each}
</ul>{/if}
