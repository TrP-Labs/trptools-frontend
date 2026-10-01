<script lang="ts">
    import { goto } from '$app/navigation';
    import { IconChecks, IconSettings, IconExternalLink } from '@tabler/icons-svelte';
    import ObjectPage from '$lib/components/layout/ObjectPage.svelte';
    import Connection from '$lib/components/claimables/Connection.svelte';
    import Field from '$lib/components/ui/Field.svelte';
    import Input from '$lib/components/ui/Input.svelte';
    import TranslatableField from '$lib/components/i18n/TranslatableField.svelte';
    import ColorInput from '$lib/components/ui/ColorInput.svelte';
    import Select from '$lib/components/ui/Select.svelte';
    import Toggle from '$lib/components/ui/Toggle.svelte';
    import Button from '$lib/components/ui/Button.svelte';
    import Badge from '$lib/components/ui/Badge.svelte';
    import { api, errorMessage } from '$lib/api/client';
    import { m } from '$lib/paraglide/messages.js';
    import { refreshData } from '$lib/utils/refresh';
    import { toasts } from '$lib/stores/toast.svelte';
    import type { PageProps } from './$types';
    let { data }: PageProps = $props();
    // svelte-ignore state_referenced_locally
    let draft = $state({ ...data.claim, rankId: data.claim.rankId ?? '' });
    $effect(() => { draft = { ...data.claim, rankId: data.claim.rankId ?? '' }; });
    let busy = $state(false);
    let base = $derived(`/dashboard/${data.group.slug}/claimables`);
    let sections = $derived([{ id: 'requirements', label: m.claimables_requirements(), icon: IconChecks }, { id: 'details', label: m.claimables_details(), icon: IconSettings }]);
    let ranks = $derived(data.ranks.map(rank => ({ value: rank.id, label: rank.name })));
    let maximumOptions = $derived(data.ranks.map(rank => ({ value: rank.rank, label: `${rank.name} (${rank.rank})` })));
    async function save(section: string) {
        busy = true;
        try {
            const body = section === 'requirements'
                ? { rankId: draft.rankId, minimumAccountAgeDays: draft.minimumAccountAgeDays, requireDiscord: draft.requireDiscord, maximumRank: draft.maximumRank, enabled: draft.enabled }
                : { name: draft.name.trim(), description: draft.description, color: draft.color, translations: draft.translations };
            const result = await api.claimables({ claimId: draft.id }).patch(body);
            if (result.error) throw result.error;
            toasts.success(m.claimables_saved());
        } catch (error) { toasts.error(errorMessage(error, m.claimables_error())); }
        finally { busy = false; }
        await refreshData();
    }
    async function remove() {
        if (!confirm(m.claimables_delete_confirm())) return;
        busy = true;
        try {
            const result = await api.claimables({ claimId: draft.id }).delete();
            if (result.error) throw result.error;
            await goto(base);
        } catch (error) { toasts.error(errorMessage(error, m.claimables_error())); }
        finally { busy = false; }
    }
</script>
<svelte:head><title>{data.claim.name} — {data.group.name}</title></svelte:head>
<ObjectPage backHref={base} backLabel={m.claimables_title()} title={data.claim.name} accent={data.claim.color} {sections}>
    {#snippet meta()}<Badge tone={data.claim.enabled && data.claim.rankId ? 'success' : 'neutral'}>{data.claim.enabled && data.claim.rankId ? m.claimables_open() : m.claimables_closed()}</Badge>{/snippet}
    {#snippet actions()}{#if data.claim.enabled && data.group.visibility !== 'PRIVATE'}<Button href="/g/{data.group.slug}/claim/{data.claim.slug}" variant="ghost">{m.dashboard_view_public_page()}<IconExternalLink size={15}/></Button>{/if}{/snippet}
    {#snippet children(section)}
        <Connection groupId={data.group.id} connection={data.connection}/>
        <form class="card space-y-6 p-5" onsubmit={(event) => { event.preventDefault(); save(section); }}>
            {#if section === 'requirements'}
                <Field label={m.claimables_rank()} for="target-rank"><Select id="target-rank" bind:value={draft.rankId} options={ranks}/></Field>
                <div><p class="text-sm font-medium">{m.claimables_member()}</p><p class="mt-1 text-xs text-text-muted">{m.claimables_member_hint()}</p></div>
                <Field label={m.claimables_age()} hint={m.claimables_age_hint()} for="minimum-age"><Input id="minimum-age" type="number" bind:value={draft.minimumAccountAgeDays} min={0} max={36500} required/></Field>
                <Toggle bind:checked={draft.requireDiscord} label={m.claimables_discord()} description={m.claimables_discord_hint()}/>
                <Field label={m.claimables_maximum()} hint={m.claimables_maximum_hint()} for="maximum-rank"><Select id="maximum-rank" bind:value={draft.maximumRank} options={maximumOptions}/></Field>
                <Toggle bind:checked={draft.enabled} label={m.claimables_enabled()} description={m.claimables_enabled_hint()} disabled={!data.connection.connected}/>
            {:else}
                <Field label={m.claimables_name()} for="claim-name"><TranslatableField id="claim-name" bind:value={draft.name} bind:translations={draft.translations} field="name" sourceLocale={data.group.sourceLocale} maxlength={100}/></Field>
                <Field label={m.claimables_description()} for="claim-description"><TranslatableField id="claim-description" bind:value={draft.description} bind:translations={draft.translations} field="description" sourceLocale={data.group.sourceLocale} maxlength={4000} multiline/></Field>
                <Field label={m.claimables_color()}><ColorInput bind:value={draft.color}/></Field>
            {/if}
            <div class="flex flex-wrap gap-3"><Button type="submit" loading={busy} disabled={!data.connection.hasWriteScope || !draft.rankId || !draft.name.trim()}>{m.claimables_save()}</Button>{#if section === 'details'}<Button variant="danger" disabled={busy} onclick={remove}>{m.claimables_delete()}</Button>{/if}</div>
        </form>
    {/snippet}
</ObjectPage>
