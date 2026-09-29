<script lang="ts">
    import { onMount } from 'svelte';
    import { IconCheck, IconPlus } from '@tabler/icons-svelte';
    import Button from '$lib/components/ui/Button.svelte';
    import { api, errorMessage, loginUrl } from '$lib/api/client';
    import { toasts } from '$lib/stores/toast.svelte';
    import { m } from '$lib/paraglide/messages.js';
    let { groupId, signedIn }: { groupId: string; signedIn: boolean } = $props();
    let following = $state(false);
    let ready = $state(false);
    let busy = $state(false);
    onMount(async () => {
        if (!signedIn) return;
        const { data } = await api.users.me.follows.get();
        if (data) { following = data.some((group) => group.id === groupId); ready = true; }
    });
    async function toggle() {
        busy = true;
        try {
            const { error } = await api.users.me.follows({ groupId }).put({ following: !following });
            if (error) throw error;
            following = !following;
        } catch (error) { toasts.error(errorMessage(error, m.follow_save_failed())); }
        finally { busy = false; }
    }
</script>
{#if signedIn}
    <Button size="sm" variant="secondary" loading={busy} disabled={!ready} onclick={toggle} aria-pressed={following}>
        {#if following}<IconCheck size={15} />{m.follow_following()}{:else}<IconPlus size={15} />{m.follow_action()}{/if}
    </Button>
{:else}
    <Button size="sm" variant="secondary" href={loginUrl()} data-sveltekit-reload>{m.follow_sign_in()}</Button>
{/if}
