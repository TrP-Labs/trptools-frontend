<script lang="ts">
    import { IconBrandDiscord, IconSquareRotated, IconExternalLink, IconArrowLeft } from '@tabler/icons-svelte';
    import Avatar from '$lib/components/users/Avatar.svelte';
    import { m } from '$lib/paraglide/messages.js';
    import type { PageProps } from './$types';
    let { data }: PageProps = $props();
    let join = $derived(data.join);
    let discord = $derived(join.destination === 'discord');
    let service = $derived(discord ? 'Discord' : 'Roblox');
</script>
<svelte:head><title>{discord ? m.join_on_discord() : m.join_view_roblox()} · {join.group.name} · TrPTools</title><meta name="robots" content="noindex" /></svelte:head>
<div class="mx-auto flex min-h-[65vh] max-w-xl items-center px-4 py-12">
    <div class="w-full overflow-hidden rounded-2xl border border-border-base bg-background-elevated shadow-lg">
        <div class="h-2" style:background={join.group.accentColor}></div>
        <div class="space-y-6 p-6 sm:p-8">
            <a class="inline-flex items-center gap-2 text-sm text-text-muted hover:text-text" href="/g/{join.group.slug}"><IconArrowLeft size={16} /> {m.join_back_group()}</a>
            <div class="flex items-center gap-4"><Avatar src={join.group.icon} name={join.group.name} size={56} /><div class="min-w-0"><p class="text-sm text-text-muted">{m.join_destination({ service })}</p><h1 class="break-words text-2xl font-bold text-text">{join.group.name}</h1></div></div>
            <p class="leading-relaxed text-text-muted">{m.join_leaving({ service })}</p>
            <div class="rounded-xl border border-border-base bg-background-secondary p-4 text-sm text-text-muted"><p>{m.join_terms_notice({ service })}</p><a class="mt-2 inline-block text-accent hover:underline" href={discord ? 'https://discord.com/terms' : 'https://en.help.roblox.com/hc/en-us/articles/115004647846-Roblox-Terms-of-Use'} target="_blank" rel="noopener noreferrer">{m.join_read_terms({ service })} <IconExternalLink size={13} class="inline" /></a></div>
            <a class="flex w-full items-center justify-center gap-3 rounded-xl px-5 py-3.5 font-semibold text-white transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent" style:background={discord ? '#5865f2' : '#2673c8'} href={join.url} rel="noopener noreferrer">{#if discord}<IconBrandDiscord size={24} />{:else}<IconSquareRotated size={24} />{/if}{discord ? m.join_on_discord() : m.join_view_roblox()}<IconExternalLink size={17} /></a>
            {#if data.user}<p class="text-xs text-text-subtle">{m.join_confirmation_setting()} <a class="text-accent hover:underline" href="/settings">{m.common_account()}</a></p>{/if}
        </div>
    </div>
</div>
