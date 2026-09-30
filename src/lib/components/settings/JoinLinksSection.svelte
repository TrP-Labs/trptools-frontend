<script lang="ts">
    import Card from '$lib/components/ui/Card.svelte';
    import Input from '$lib/components/ui/Input.svelte';
    import Toggle from '$lib/components/ui/Toggle.svelte';
    import Button from '$lib/components/ui/Button.svelte';
    import { api, errorMessage } from '$lib/api/client';
    import { toasts } from '$lib/stores/toast.svelte';
    import { refreshData } from '$lib/utils/refresh';
    import { m } from '$lib/paraglide/messages.js';
    let { group }: { group: { id: string; slug: string; discordInvite: string; robloxJoinEnabled: boolean } } = $props();
    // svelte-ignore state_referenced_locally
    let discordInvite = $state(group.discordInvite);
    // svelte-ignore state_referenced_locally
    let robloxJoinEnabled = $state(group.robloxJoinEnabled);
    let saving = $state(false);
    async function save() {
        saving = true;
        try {
            const { error } = await api.groups({ groupId: group.id }).patch({ discordInvite, robloxJoinEnabled });
            if (error) throw error;
            toasts.success(m.dashboard_settings_settings_saved());
        } catch (error) { toasts.error(errorMessage(error)); saving = false; return; }
        saving = false;
        await refreshData();
    }
</script>
<Card title={m.join_settings_title()} description={m.join_settings_description()}>
    <div class="space-y-6">
        <Toggle bind:checked={robloxJoinEnabled} label={m.join_roblox_enabled()} description={m.join_roblox_description()} />
        <div class="space-y-2">
            <label class="text-sm font-medium text-text" for="discord-invite">{m.join_discord_invite()}</label>
            <Input id="discord-invite" bind:value={discordInvite} placeholder="https://discord.gg/…" maxlength={200} />
            <p class="text-xs text-text-muted">{m.join_discord_hint()}</p>
        </div>
        <div class="space-y-2 rounded-lg border border-border-base bg-background-secondary p-4 text-sm">
            <p class="font-medium text-text">{m.join_share_links()}</p>
            {#each ['roblox', 'discord'] as destination}
                <a class="block break-all text-accent hover:underline" href="/g/{group.slug}/join/{destination}">/g/{group.slug}/join/{destination}</a>
            {/each}
            <p class="text-xs text-text-muted">{m.join_link_visibility()}</p>
        </div>
    </div>
    {#snippet actions()}<Button onclick={save} loading={saving}>{m.common_save()}</Button>{/snippet}
</Card>
