<script lang="ts">
    import { goto } from '$app/navigation';
    import { IconCalendarTime, IconFileText, IconUsers, IconEye } from '@tabler/icons-svelte';
    import ObjectPage from '$lib/components/layout/ObjectPage.svelte';
    import ShiftEditor, { type ShiftDraft } from './ShiftEditor.svelte';
    import Button from '$lib/components/ui/Button.svelte';
    import Field from '$lib/components/ui/Field.svelte';
    import Input from '$lib/components/ui/Input.svelte';
    import Toggle from '$lib/components/ui/Toggle.svelte';
    import TranslatableField from '$lib/components/i18n/TranslatableField.svelte';
    import { api, errorMessage } from '$lib/api/client';
    import { toasts } from '$lib/stores/toast.svelte';
    import { refreshData } from '$lib/utils/refresh';
    import { buildRule, fromLocalInput, parseRule, toLocalInput } from '$lib/utils/recurrence';
    import type { GroupSummary, ShiftEvent } from '$lib/api/types';
    import { m } from '$lib/paraglide/messages.js';
    let { group, event }: { group: Pick<GroupSummary, 'id' | 'slug' | 'sourceLocale'>; event?: ShiftEvent } = $props();
    function initialDraft(): ShiftDraft {
        const start = event ? new Date(event.startTime) : new Date(Date.now() + 3600000);
        const rule = event ? parseRule(event.rrule) : { repeat: 'WEEKLY' as const, days: [((start.getDay() + 6) % 7)] };
        return { name: event?.name ?? '', description: event?.description ?? '', color: event?.color ?? '#4287f5',
            startLocal: toLocalInput(start), duration: event?.duration ?? 120, repeat: rule.repeat, days: rule.days,
            visibility: event?.visibility ?? 'PUBLIC', hostLevel: event?.hostLevel ?? 2, translations: structuredClone(event?.translations ?? {}) };
    }
    let draft = $state(initialDraft());
    function initialDemand() { return { onDemand: event?.onDemand ?? false, minimumVotes: event?.minimumVotes ?? 10,
        voteLeadMinutes: event?.voteLeadMinutes ?? 2880, decisionLeadMinutes: event?.decisionLeadMinutes ?? 1440,
        minimumRank: event?.minimumRank ?? 0, voteRequireDiscord: event?.voteRequireDiscord ?? false,
        websiteVoting: event?.websiteVoting ?? true, showVoters: event?.showVoters ?? false }; }
    let demand = $state(initialDemand());
    function initialText() { return event?.postDescription ?? ''; }
    function initialPrivacy(field: 'publicStaff' | 'publicDrivers') { return event?.[field] ?? false; }
    let postDescription = $state(initialText());
    let publicStaff = $state(initialPrivacy('publicStaff'));
    let publicDrivers = $state(initialPrivacy('publicDrivers'));
    let busy = $state(false);
    const sections = $derived([
        { id: 'general', label: m.shifts_rule_general(), icon: IconFileText },
        { id: 'recurrence', label: m.shifts_rule_recurrence(), icon: IconCalendarTime },
        { id: 'on-demand', label: m.shifts_rule_demand(), icon: IconUsers },
        { id: 'visibility', label: m.shifts_rule_visibility(), icon: IconEye }
    ]);
    async function save(section: string) {
        const start = fromLocalInput(draft.startLocal);
        const originalRule = event ? parseRule(event.rrule) : null;
        const unchangedRule = originalRule?.repeat === draft.repeat && JSON.stringify(originalRule.days) === JSON.stringify(draft.days);
        const recurrence = { startTime: start, rrule: event && unchangedRule ? event.rrule : buildRule({ repeat: draft.repeat, days: draft.days }, start), duration: draft.duration };
        const general = { name: draft.name.trim(), description: draft.description, color: draft.color, translations: draft.translations, postDescription };
        const visibility = { visibility: draft.visibility, hostLevel: draft.hostLevel, publicStaff, publicDrivers };
        if (demand.onDemand && demand.voteLeadMinutes <= demand.decisionLeadMinutes) { toasts.error(m.shifts_demand_cutoff_hint()); return; }
        busy = true;
        let createdId: string | undefined;
        try {
            if (event) {
                const body = section === 'general' ? general : section === 'recurrence' ? recurrence : section === 'on-demand' ? demand : visibility;
                const { error } = await api.schedule({ eventId: event.eventId }).patch(body);
                if (error) throw error;
            } else {
                const { data, error } = await api.schedule.post({ groupId: group.id, ...general, ...recurrence, ...visibility, ...demand });
                if (!data) throw error;
                createdId = data.eventId;
            }
            toasts.success(m.shifts_rule_saved());
        } catch (error) { toasts.error(errorMessage(error, m.shifts_rule_error())); return; }
        finally { busy = false; }
        if (createdId) await goto(`/dashboard/${group.slug}/schedule/${createdId}`);
        else await refreshData();
    }
    async function remove() {
        if (!event || !confirm(m.shifts_rule_archive_confirm())) return;
        const { error } = await api.schedule({ eventId: event.eventId }).delete();
        if (error) { toasts.error(errorMessage(error)); return; }
        await goto(`/dashboard/${group.slug}/schedule`);
    }
</script>
<ObjectPage backHref="/dashboard/{group.slug}/schedule" backLabel={m.shifts_schedule()} title={event?.name ?? m.shifts_rule_new()} description={m.shifts_rule_snapshot()} {sections} accent={draft.color}>
    {#snippet actions()}{#if event}<Button variant="danger" onclick={remove}>{m.shifts_rule_archive()}</Button>{/if}{/snippet}
    {#snippet children(section)}
        <section class="card max-w-3xl space-y-5 p-5">
            {#if section === 'on-demand'}
                <Toggle bind:checked={demand.onDemand} label={m.shifts_demand_enabled()} description={m.shifts_demand_hint()} />
                {#if demand.onDemand}
                    <div class="grid gap-4 sm:grid-cols-2">
                        <Field label={m.shifts_demand_minimum()}><Input type="number" min="1" max="10000" bind:value={demand.minimumVotes} /></Field>
                        <Field label={m.shifts_demand_rank()} hint={m.shifts_demand_rank_hint()}><Input type="number" min="0" max="255" bind:value={demand.minimumRank} /></Field>
                        <Field label={m.shifts_demand_open()}><Input type="number" min="1" max="172800" bind:value={demand.voteLeadMinutes} /></Field>
                        <Field label={m.shifts_demand_cutoff()} hint={m.shifts_demand_cutoff_hint()}><Input type="number" min="0" max="172799" bind:value={demand.decisionLeadMinutes} /></Field>
                    </div>
                    <Toggle bind:checked={demand.voteRequireDiscord} label={m.shifts_demand_discord()} />
                    <Toggle bind:checked={demand.websiteVoting} label={m.shifts_demand_website()} />
                    <Toggle bind:checked={demand.showVoters} label={m.shifts_demand_show()} description={m.shifts_demand_show_hint()} />
                {/if}
                <Button loading={busy} onclick={() => save(section)}>{event ? m.common_save_changes() : m.shifts_rule_new()}</Button>
            {:else}
                {#if section === 'general'}
                    <Field label={m.shifts_post_description()} hint={m.shifts_post_hint()}><TranslatableField field="postDescription" sourceLocale={group.sourceLocale} bind:translations={draft.translations} multiline bind:value={postDescription} maxlength={10000} rows={4} /></Field>
                {:else if section === 'visibility'}
                    <Toggle bind:checked={publicStaff} label={m.shifts_public_staff()} description={m.shifts_public_history_hint()} />
                    <Toggle bind:checked={publicDrivers} label={m.shifts_public_drivers()} />
                {/if}
                <ShiftEditor bind:draft show={section === 'recurrence' ? 'recurrence' : section === 'visibility' ? 'visibility' : 'general'} mode={event ? 'edit' : 'create'} sourceLocale={group.sourceLocale} ranksHref="/dashboard/{group.slug}/signups" {busy} onsave={() => save(section)} />
            {/if}
        </section>
    {/snippet}
</ObjectPage>
