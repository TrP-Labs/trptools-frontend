<script lang="ts">
    import { onMount } from 'svelte';
    import PageHeader from '$lib/components/ui/PageHeader.svelte';
    import Card from '$lib/components/ui/Card.svelte';
    import Button from '$lib/components/ui/Button.svelte';
    import Toggle from '$lib/components/ui/Toggle.svelte';
    import { api, errorMessage } from '$lib/api/client';
    import { refreshData } from '$lib/utils/refresh';
    import { toasts } from '$lib/stores/toast.svelte';
    import { m } from '$lib/paraglide/messages.js';
    import type { PageProps } from './$types';
    let { data }: PageProps = $props();
    // svelte-ignore state_referenced_locally
    let instantRedirects = $state(data.user?.instantRedirects ?? false);
    let saving = $state(false);
    let ready = $state(false);
    onMount(() => { ready = true; });
    async function save() {
        if (saving) return;
        saving = true;
        try {
            const { error } = await api.users.me.preferences.patch({ instantRedirects });
            if (error) throw error;
            await refreshData();
            toasts.success(m.settings_settings_saved());
        } catch (error) { toasts.error(errorMessage(error, m.settings_could_not_save_settings())); }
        finally { saving = false; }
    }
</script>
<svelte:head><title>{m.settings_behavior()} — TrPTools</title></svelte:head>
<PageHeader title={m.settings_behavior()} description={m.settings_behavior_description()} />
<Card title={m.join_account_title()} description={m.join_account_description()}>
    <Toggle bind:checked={instantRedirects} disabled={!ready || saving} label={m.join_instant_redirects()} description={m.join_instant_description()} />
    {#snippet actions()}<Button disabled={!ready} loading={saving} onclick={save}>{m.common_save()}</Button>{/snippet}
</Card>
