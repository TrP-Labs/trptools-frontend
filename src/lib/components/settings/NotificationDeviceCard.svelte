<script lang="ts">
    import { onMount } from 'svelte';
    import Card from '$lib/components/ui/Card.svelte';
    import Button from '$lib/components/ui/Button.svelte';
    import { disableDevice, pushSupported } from '$lib/utils/push';
    import { m } from '$lib/paraglide/messages.js';
    import { toasts } from '$lib/stores/toast.svelte';
    let active = $state(false);
    let busy = $state(false);
    onMount(async () => {
        if (!pushSupported()) return;
        const worker = await navigator.serviceWorker.getRegistration('/');
        active = Boolean(await worker?.pushManager.getSubscription());
    });
    async function turnOff() {
        busy = true;
        try { await disableDevice(); active = false; }
        catch { toasts.error(m.notify_failed()); }
        finally { busy = false; }
    }
</script>
<Card title={m.notify_device_title()} description={m.notify_device_description()}>
    {#if active}<Button variant="secondary" loading={busy} onclick={turnOff}>{m.notify_device_off()}</Button>
    {:else}<p class="text-sm text-text-muted">{m.notify_device_setup_hint()}</p>{/if}
</Card>
