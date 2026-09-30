<script lang="ts">
    import { onMount } from 'svelte';
    import { IconCheck, IconPlus } from '@tabler/icons-svelte';
    import Button from '$lib/components/ui/Button.svelte';
    import { engagement } from '$lib/stores/engagement.svelte';
    import { api, errorMessage, loginUrl } from '$lib/api/client';
    import { toasts } from '$lib/stores/toast.svelte';
    import { m } from '$lib/paraglide/messages.js';
    let { groupId, userId }: { groupId: string; userId?: string } = $props();
    let choice = $derived(engagement(userId ?? '', groupId));
    let following = $derived(choice.data?.following ?? false);
    let busy = $state(false);
    onMount(() => { if (userId) void choice.load(); });
    async function toggle() {
        busy = true;
        try {
            const { error } = await api.users.me.follows({ groupId }).put({ following: !following });
            if (error) throw error;
            choice.update({ following: !following });
        } catch (error) { toasts.error(errorMessage(error, m.follow_save_failed())); }
        finally { busy = false; }
    }
</script>
{#if userId}
    <Button size="sm" variant="secondary" loading={busy} disabled={!choice.data} onclick={toggle} aria-pressed={following}>
        {#if following}<IconCheck size={15} />{m.follow_following()}{:else}<IconPlus size={15} />{m.follow_action()}{/if}
    </Button>
{:else}
    <Button size="sm" variant="secondary" href={loginUrl()} data-sveltekit-reload>{m.follow_sign_in()}</Button>
{/if}
