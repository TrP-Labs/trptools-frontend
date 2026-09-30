<script lang="ts">
    import { untrack } from 'svelte';
    import { IconBell, IconBellCheck } from '@tabler/icons-svelte';
    import Button from '$lib/components/ui/Button.svelte';
    import { engagement, pushDeviceRevision } from '$lib/stores/engagement.svelte';
    import { api, errorMessage, loginUrl } from '$lib/api/client';
    import { enableDevice, pushSupported } from '$lib/utils/push';
    import { toasts } from '$lib/stores/toast.svelte';
    import { m } from '$lib/paraglide/messages.js';
    let { groupId, eventId, userId, gentle = false }: { groupId: string; eventId?: string; userId?: string; gentle?: boolean } = $props();
    let choice = $derived(engagement(userId ?? '', groupId, eventId));
    let enabled = $derived(eventId ? choice.data?.shiftReminder : choice.data?.groupReminder);
    let inherited = $derived(Boolean(eventId && choice.data?.groupReminder));
    let busy = $state(false);
    let supported = $state(true);
    let notice = $state('');
    let deviceReady = $state(false);
    $effect(() => {
        const current = choice, account = userId;
        pushDeviceRevision();
        let active = true;
        supported = pushSupported();
        untrack(() => { void (async () => {
            if (account) await current.load();
            if (pushSupported()) {
                try {
                    const registration = await navigator.serviceWorker.getRegistration('/');
                    const subscription = await registration?.pushManager.getSubscription();
                    if (active) deviceReady = Boolean(subscription) && localStorage.getItem('trptools:push-account') === account;
                } catch { if (active) deviceReady = false; }
            }
        })(); });
        return () => { active = false; };
    });
    async function enableThisDevice() {
        if (!choice.data?.publicKey) return;
        busy = true;
        try {
            const result = await enableDevice(choice.data.publicKey, userId!);
            if (result === 'enabled') { deviceReady = true; notice = m.notify_device_enabled(); }
            else notice = result === 'denied' ? m.notify_denied() : m.notify_unsupported();
        } catch (error) { toasts.error(errorMessage(error, m.notify_failed())); }
        finally { busy = false; }
    }
    async function toggle() {
        busy = true;
        notice = '';
        try {
            if (!enabled) {
                if (!choice.data?.publicKey) { notice = m.notify_unconfigured(); return; }
                const result = await enableDevice(choice.data.publicKey, userId!);
                if (result === 'enabled') deviceReady = true;
                if (result !== 'enabled') { notice = result === 'denied' ? m.notify_denied() : m.notify_unsupported(); return; }
            }
            const next = !enabled;
            const { error } = await api.notifications.groups({ groupId }).put({ enabled: next, eventId });
            if (error) throw error;
            choice.update(eventId ? { shiftReminder: next } : { groupReminder: next });
            toasts.success(next ? m.notify_enabled() : m.notify_disabled());
        } catch (error) { toasts.error(errorMessage(error, m.notify_failed())); }
        finally { busy = false; }
    }
</script>
<div class="min-w-0">
    {#if !userId}
        <Button size="sm" variant="secondary" href={loginUrl()} data-sveltekit-reload><IconBell size={15} />{m.notify_sign_in()}</Button>
    {:else if inherited && !enabled}
        <span class="inline-flex items-center gap-1.5 text-xs text-text-muted"><IconBellCheck size={15} />{m.notify_group_covers()}</span>
    {:else}
        <Button size="sm" variant="secondary" loading={busy} disabled={!choice.data || (!enabled && (!supported || !choice.data.publicKey))} onclick={toggle} aria-pressed={Boolean(enabled)}>
            {#if enabled}<IconBellCheck size={15} />{m.notify_on()}{:else}<IconBell size={15} />{m.notify_action()}{/if}
        </Button>
    {/if}
    {#if userId && supported && (enabled || inherited) && !deviceReady && choice.data?.publicKey}
        <Button size="sm" variant="ghost" loading={busy} onclick={enableThisDevice}>{m.notify_device_action()}</Button>
    {/if}
    {#if notice}<p class="mt-2 max-w-sm text-xs text-text-muted" role="status">{notice}</p>
    {:else if userId && !supported}<p class="mt-2 max-w-sm text-xs text-text-muted">{m.notify_unsupported()}</p>
    {:else if userId && choice.data && !choice.data.publicKey}<p class="mt-2 max-w-sm text-xs text-text-muted">{m.notify_unconfigured()}</p>
    {:else if gentle && !enabled && !inherited}<p class="mt-2 max-w-sm text-xs text-text-muted">{m.notify_gentle()}</p>{/if}
</div>
