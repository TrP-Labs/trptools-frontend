<script lang="ts">
    import { onMount, onDestroy } from 'svelte';
    import { page } from '$app/state';
    import { IconCheck, IconX, IconQuestionMark, IconChevronLeft, IconAward } from '@tabler/icons-svelte';
    import Button from '$lib/components/ui/Button.svelte';
    import Spinner from '$lib/components/ui/Spinner.svelte';
    import { api, errorMessage } from '$lib/api/client';
    import type { ClaimableRank, ClaimableStanding } from '$lib/api/types';
    import { m } from '$lib/paraglide/messages.js';
    import { refreshData } from '$lib/utils/refresh';
    import { localized } from '$lib/utils/translations';
    let { claim, standing, group }: { claim: ClaimableRank; standing: ClaimableStanding | null; group: { slug: string; name: string; robloxId: string } } = $props();
    let busy = $state(false), waiting = $state(false), success = $state(false), pending = $state(false), message = $state('');
    let active = true;
    onDestroy(() => { active = false; });
    onMount(() => { if (standing?.pending) { pending = true; void waitForConfirmation(); } });
    let checks = $derived([
        { label: m.claimables_member(), passed: standing?.member ?? null },
        ...(claim.minimumAccountAgeDays > 0 ? [{ label: m.claimables_age_requirement({ days: claim.minimumAccountAgeDays }), passed: standing?.age ?? null }] : []),
        ...(claim.requireDiscord ? [{ label: m.claimables_discord(), passed: standing?.discord ?? null }] : []),
        { label: m.claimables_rank_requirement({ rank: claim.maximumRank }), passed: standing?.rank ?? null }
    ]);
    async function waitForConfirmation() {
        if (busy) return;
        busy = true; waiting = true; message = '';
        const deadline = Date.now() + 90_000;
        try {
            while (active && Date.now() < deadline) {
                // A fresh Open Cloud read, spaced to fit the authorization's quota.
                await new Promise(resolve => setTimeout(resolve, 4000));
                if (!active) return;
                const result = await api.claimables({ claimId: claim.id }).status.get();
                if (!active) return;
                if (result.error) {
                    if ([429, 503].includes(result.error.status)) continue;
                    throw result.error;
                }
                if (result.data?.state === 'CONFIRMED') {
                    success = true; pending = false;
                    await refreshData();
                    return;
                }
            }
            if (active) message = m.claimables_pending();
        } catch (error) { if (active) message = errorMessage(error, m.claimables_error()); }
        finally { if (active) { busy = false; waiting = false; } }
    }
    async function claimRank() {
        if (busy) return;
        busy = true; message = '';
        try {
            const result = await api.claimables({ claimId: claim.id }).claim.post();
            if (result.error) throw result.error;
            pending = true;
        } catch (error) {
            message = errorMessage(error, m.claimables_error());
            busy = false;
            await refreshData();
            return;
        }
        busy = false;
        await waitForConfirmation();
    }
    async function linkDiscord() {
        busy = true; message = '';
        try {
            const result = await api.auth.discord.link.get({ query: { json: 'true', returnTo: page.url.pathname } });
            if (result.error || !result.data) throw result.error;
            window.location.assign(result.data.url);
        } catch (error) { message = errorMessage(error, m.claimables_error()); }
        finally { busy = false; }
    }
</script>
<div class="mx-auto max-w-2xl px-4 py-8 sm:py-12">
    <a href="/g/{group.slug}" class="inline-flex items-center gap-1 text-sm text-text-muted hover:text-text"><IconChevronLeft size={15}/>{group.name}</a>
    <div class="card mt-5 overflow-hidden">
        <div class="h-1.5" style="background: {claim.color}"></div>
        <div class="space-y-6 p-5 sm:p-8">
            {#if success}
                <div role="status" class="space-y-3 text-center">
                    <IconCheck size={44} class="mx-auto text-success"/>
                    <h1 class="text-2xl font-semibold text-text">{m.claimables_success()}</h1>
                    <p class="text-text-muted wrap-anywhere">{m.claimables_success_hint({ rank: claim.rankName ?? claim.name })}</p>
                    <Button href="/g/{group.slug}">{group.name}</Button>
                </div>
            {:else}
                <header class="space-y-2">
                    <IconAward size={28} style="color: {claim.color}"/>
                    <h1 class="text-2xl font-semibold text-text wrap-anywhere">{localized(claim, 'name')}</h1>
                    <p class="text-lg font-medium wrap-anywhere" style="color: {claim.rankColor ?? claim.color}">{m.claimables_receive({ rank: claim.rankName ?? claim.name })}</p>
                    {#if localized(claim, 'description')}<p class="whitespace-pre-line text-sm text-text-muted wrap-anywhere">{localized(claim, 'description')}</p>{/if}
                    <p class="text-sm text-text-muted">{m.claimables_replace_hint()}</p>
                </header>
                <section>
                    <h2 class="mb-3 font-semibold">{m.claimables_requirements()}</h2>
                    <ul class="space-y-3">
                        {#each checks as check}
                            <li class="flex items-start gap-3">
                                <span class="mt-0.5 shrink-0" aria-label={check.passed === true ? m.claimables_met() : check.passed === false ? m.claimables_not_met() : m.claimables_check_unknown()}>
                                    {#if check.passed === true}<IconCheck size={20} class="text-success"/>{:else if check.passed === false}<IconX size={20} class="text-danger"/>{:else}<IconQuestionMark size={20} class="text-text-muted"/>{/if}
                                </span>
                                <p class="min-w-0 text-sm text-text wrap-anywhere">{check.label}</p>
                            </li>
                        {/each}
                    </ul>
                    {#if standing?.accountAgeDays !== null && standing?.accountAgeDays !== undefined}<p class="mt-3 text-xs text-text-muted">{m.claimables_age_current({ days: standing.accountAgeDays })}</p>{/if}
                </section>
                {#if waiting}
                    <div role="status" class="flex items-center gap-3 text-sm text-text-muted"><Spinner size={20}/>{m.claimables_waiting()}</div>
                {:else if pending}
                    <Button onclick={waitForConfirmation} loading={busy}>{m.claimables_check_again()}</Button>
                {:else if !page.data.user}
                    <Button href="/login?next={encodeURIComponent(page.url.pathname)}">{m.claimables_sign_in()}</Button>
                {:else}
                    {#if standing?.alreadyHeld}<p class="text-sm text-text-muted">{m.claimables_already_held()}</p>{/if}
                    {#if standing && !standing.connected}<p class="text-sm text-text-muted">{m.claimables_connection_error()}</p>{/if}
                    <div class="flex flex-wrap gap-3">
                        <Button loading={busy} disabled={!standing?.canClaim} onclick={claimRank}>{m.claimables_action()}</Button>
                        {#if standing?.member === false}<Button href="https://www.roblox.com/communities/{group.robloxId}" target="_blank" variant="ghost">{m.claimables_join()}</Button>{/if}
                        {#if claim.requireDiscord && standing?.discord === false}<Button variant="ghost" disabled={busy} onclick={linkDiscord}>{m.claimables_link()}</Button>{/if}
                        <Button variant="ghost" disabled={busy} onclick={() => refreshData()}>{m.claimables_refresh()}</Button>
                    </div>
                    {#if claim.minimumAccountAgeDays > 0 && standing?.age === null}<a href="/login?next={encodeURIComponent(page.url.pathname)}" class="block text-sm text-accent hover:underline">{m.claimables_unverified_age()}</a>{/if}
                {/if}
                {#if message}<p role="status" class="text-sm text-text-muted">{message}</p>{/if}
            {/if}
        </div>
    </div>
</div>
