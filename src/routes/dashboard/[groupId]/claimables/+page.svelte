<script lang="ts">
    import { afterNavigate, goto } from '$app/navigation';
    import { IconAward, IconChevronRight, IconPlus } from '@tabler/icons-svelte';
    import PageHeader from '$lib/components/ui/PageHeader.svelte';
    import Button from '$lib/components/ui/Button.svelte';
    import Badge from '$lib/components/ui/Badge.svelte';
    import Modal from '$lib/components/ui/Modal.svelte';
    import Field from '$lib/components/ui/Field.svelte';
    import Input from '$lib/components/ui/Input.svelte';
    import Select from '$lib/components/ui/Select.svelte';
    import EmptyState from '$lib/components/ui/EmptyState.svelte';
    import Connection from '$lib/components/claimables/Connection.svelte';
    import { api, errorMessage } from '$lib/api/client';
    import { toasts } from '$lib/stores/toast.svelte';
    import { consumeUrlMarkers } from '$lib/utils/urlMarker';
    import { m } from '$lib/paraglide/messages.js';
    import type { PageProps } from './$types';
    let { data }: PageProps = $props();
    let base = $derived(`/dashboard/${data.group.slug}/claimables`);
    let open = $state(false), busy = $state(false), name = $state(''), rankId = $state('');
    let options = $derived([{ value: '', label: m.claimables_rank() }, ...data.ranks.map(rank => ({ value: rank.id, label: rank.name }))]);
    afterNavigate(() => consumeUrlMarkers(['roblox'], values => {
        if (values.roblox === 'verified') toasts.success(m.claimables_verified());
        else if (values.roblox === 'wrong-account') toasts.error(m.claimables_wrong_account());
        else if (values.roblox) toasts.error(m.claimables_oauth_failed());
    }));
    async function create() {
        busy = true;
        try {
            const result = await api.claimables.post({ groupId: data.group.id, rankId, name: name.trim() });
            if (result.error || !result.data) throw result.error;
            await goto(`${base}/${result.data.id}`);
        } catch (error) { toasts.error(errorMessage(error, m.claimables_error())); }
        finally { busy = false; }
    }
</script>
<svelte:head><title>{m.claimables_title()} — {data.group.name}</title></svelte:head>
<PageHeader title={m.claimables_title()} description={m.claimables_intro()}>
    {#snippet actions()}<Button onclick={() => (open = true)} disabled={!data.connection.hasWriteScope}><IconPlus size={16}/>{m.claimables_create()}</Button>{/snippet}
</PageHeader>
<Connection groupId={data.group.id} connection={data.connection}/>
{#if data.claims.length === 0}
    <EmptyState title={m.claimables_empty()} description={m.claimables_empty_hint()}>{#snippet icon()}<IconAward size={28}/>{/snippet}</EmptyState>
{:else}
    <ul class="space-y-3">
        {#each data.claims as claim (claim.id)}
            <li class="card min-w-0 overflow-hidden">
                <a href="{base}/{claim.id}" class="flex items-center gap-3 p-4 transition-colors hover:bg-background-secondary/60">
                    <span class="h-10 w-1 shrink-0 rounded-full" style="background: {claim.color}"></span>
                    <div class="min-w-0 flex-1"><p class="font-medium wrap-anywhere">{claim.name}</p><p class="text-sm text-text-muted wrap-anywhere">{claim.rankName ?? m.claimables_unavailable()}</p></div>
                    <Badge tone={claim.enabled && claim.rankId ? 'success' : 'neutral'}>{claim.enabled && claim.rankId ? m.claimables_open() : m.claimables_closed()}</Badge>
                    <IconChevronRight size={16} class="shrink-0 text-text-subtle"/>
                </a>
            </li>
        {/each}
    </ul>
{/if}
<Modal bind:open title={m.claimables_create()}>
    <div class="space-y-4">
        <Field label={m.claimables_name()} for="claim-name"><Input id="claim-name" bind:value={name} maxlength={100}/></Field>
        <Field label={m.claimables_rank()} for="claim-rank"><Select id="claim-rank" bind:value={rankId} {options}/></Field>
    </div>
    {#snippet footer()}<Button variant="ghost" onclick={() => (open = false)}>{m.common_cancel()}</Button><Button loading={busy} disabled={!name.trim() || !rankId} onclick={create}>{m.claimables_create()}</Button>{/snippet}
</Modal>
