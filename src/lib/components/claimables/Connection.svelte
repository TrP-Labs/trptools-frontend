<script lang="ts">
    import Button from '$lib/components/ui/Button.svelte';
    import Badge from '$lib/components/ui/Badge.svelte';
    import { api, errorMessage } from '$lib/api/client';
    import type { ClaimableConnection } from '$lib/api/types';
    import { m } from '$lib/paraglide/messages.js';
    import { refreshData } from '$lib/utils/refresh';
    import { toasts } from '$lib/stores/toast.svelte';
    let { groupId, connection }: { groupId: string; connection: ClaimableConnection } = $props();
    let busy = $state(false);
    async function authorize() {
        busy = true;
        try {
            if (!connection.hasWriteScope) {
                const result = await api.auth.claimables.reverify.post({ groupId });
                if (result.error || !result.data) throw result.error;
                window.location.assign(result.data.url);
                return;
            }
            const result = await api.claimables.connection.post({ groupId });
            if (result.error) throw result.error;
            toasts.success(m.claimables_connected());
        } catch (error) { toasts.error(errorMessage(error, m.claimables_error())); }
        finally { busy = false; }
        await refreshData();
    }
    async function disconnect() {
        busy = true;
        try {
            const result = await api.claimables.connection.delete(undefined, { query: { groupId } });
            if (result.error) throw result.error;
        } catch (error) { toasts.error(errorMessage(error, m.claimables_error())); }
        finally { busy = false; }
        await refreshData();
    }
</script>
<section class="card mb-6 space-y-4 p-5">
    <div class="flex flex-wrap items-center gap-3">
        <h2 class="font-semibold text-text">{m.claimables_connect_title()}</h2>
        {#if connection.connected}<Badge tone="success">{m.claimables_connected()}</Badge>{/if}
    </div>
    <p class="max-w-2xl text-sm text-text-muted">{m.claimables_connect_hint()}</p>
    {#if !connection.hasWriteScope}<p class="max-w-2xl text-sm text-text-muted">{m.claimables_scope_hint()}</p>{/if}
    <div class="flex flex-wrap gap-3">
        {#if !connection.hasWriteScope || !connection.connected || !connection.authorizedByMe}
            <Button loading={busy} onclick={authorize}>{connection.hasWriteScope ? m.claimables_connect() : m.claimables_reverify()}</Button>
        {/if}
        {#if connection.connected}<Button variant="ghost" disabled={busy} onclick={disconnect}>{m.claimables_disconnect()}</Button>{/if}
    </div>
</section>
