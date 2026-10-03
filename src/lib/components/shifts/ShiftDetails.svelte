<script lang="ts">
    import { api, errorMessage, loginUrl } from '$lib/api/client';
    import { afterNavigate } from '$app/navigation';
    import { announceDiscordResult } from '$lib/utils/discordLink';
    import { page } from '$app/state';
    import { startDiscordLink } from '$lib/utils/discordLink';
    import { refreshData } from '$lib/utils/refresh';
    import { toasts } from '$lib/stores/toast.svelte';
    import Button from '$lib/components/ui/Button.svelte';
    import ImageGallery from '$lib/components/media/ImageGallery.svelte';
    import SignupSheets from './SignupSheets.svelte';
    import { formatDateTime } from '$lib/utils/format';
    import { localized } from '$lib/utils/translations';
    import type { ShiftInstance, SessionUser } from '$lib/api/types';
    import { m } from '$lib/paraglide/messages.js';
    let { shift, user }: { shift: ShiftInstance; user?: SessionUser | null } = $props();
    let busy = $state(false);
    afterNavigate(() => announceDiscordResult(() => void refreshData()));
    const past = $derived(new Date(shift.end).getTime() <= Date.now());
    async function vote() {
        busy = true;
        try {
            const { error } = await api.schedule.instances({ id: shift.id }).vote.post({ attending: !shift.voted });
            if (error) throw error;
        } catch (error) { toasts.error(errorMessage(error, m.shifts_content_error())); return; }
        finally { busy = false; }
        await refreshData();
    }
</script>
<div class="space-y-6">
    {#if shift.decision === 'CANCELED'}<section class="card border-danger p-5">{m.shifts_canceled()}</section>{/if}
    {#if shift.onDemand && shift.decision !== 'CANCELED'}
        <section class="card space-y-3 p-5" class:border-danger={shift.decision === 'FAILED'}>
            <p class="font-medium">{shift.decision === 'FAILED' ? m.shifts_demand_failed() : shift.decision === 'CONFIRMED' ? m.shifts_demand_confirmed() : m.shifts_demand_pending()}</p>
            <p class="text-sm text-text-muted">{m.shifts_demand_progress({ count: shift.voteCount, minimum: shift.minimumVotes })}</p>
            {#if shift.decision === 'PENDING'}
                <p class="text-sm text-text-muted">{m.shifts_demand_deadline({ when: formatDateTime(shift.decisionAt) })}</p>
                {#if shift.minimumRank > 0}<p class="text-sm text-text-muted">{m.shifts_minimum_rank_vote({ rank: shift.minimumRank })}</p>{/if}
                {#if !shift.websiteVoting}<p class="text-sm text-text-muted">{m.shifts_demand_website_disabled()}</p>
                {:else if !user}<Button href={loginUrl(page.url.pathname)}>{m.shifts_sign_in_vote()}</Button>
                {:else}
                    {#if shift.voted}<p class="text-sm text-success">{m.shifts_demand_voted()}</p>{/if}
                    <Button loading={busy} onclick={vote} disabled={!shift.canVote && !shift.voted}>{shift.voted ? m.shifts_demand_withdraw() : m.shifts_demand_vote()}</Button>
                    {#if shift.voteRequireDiscord && !user.discord}<Button variant="secondary" onclick={() => startDiscordLink(page.url.pathname + page.url.search)}>{m.shifts_require_discord_vote()}</Button>
                    {:else if !shift.canVote && !shift.voted}<p class="text-sm text-text-muted">{m.shifts_demand_ineligible()}</p>{/if}
                {/if}
            {/if}
            {#if shift.voters.length}<p class="text-sm wrap-anywhere"><strong>{m.shifts_demand_voters()}:</strong> {shift.voters.map(v => v.name).join(', ')}</p>{/if}
            {#if shift.withdrawnVoters.length}<p class="text-sm wrap-anywhere"><strong>{m.shifts_demand_withdrawn()}:</strong> {shift.withdrawnVoters.map(v => v.name).join(', ')}</p>{/if}
        </section>
    {/if}
    {#if !past && shift.sheets.length}
        <section class="card p-5"><h2 class="mb-4 font-semibold">{m.common_signups()}</h2>
            <SignupSheets groupId={shift.groupId} sheets={shift.sheets} eventId={shift.eventId} occurrence={shift.start}
                userId={user?.userId} discordId={user?.discord?.id} discordLinked={Boolean(user?.discord)} discordRequired={shift.discordRequired} canEdit={shift.canEditSignups} />
        </section>
    {:else if !past && shift.sheetsAvailable && new Date(shift.signupsOpenAt).getTime() > Date.now()}
        <p class="text-sm text-text-muted">{m.g_shift_signups_for_next_open({ when: formatDateTime(shift.signupsOpenAt) })}</p>
    {/if}
    {#if localized(shift, 'description')}<p class="text-sm leading-relaxed whitespace-pre-line text-text-muted">{localized(shift, 'description')}</p>{/if}
    {#if past && localized(shift, 'postDescription')}<section class="space-y-3"><h2 class="font-semibold">{m.shifts_post_description()}</h2><p class="text-sm leading-relaxed whitespace-pre-line text-text-muted">{localized(shift, 'postDescription')}</p></section>{/if}
    {#if shift.images.length}<ImageGallery images={shift.images} />{/if}
    {#if past}
        {#if shift.staff.length}<section><h2 class="mb-3 font-semibold">{m.shifts_staff_history()}</h2><ul class="space-y-2 text-sm">{#each shift.staff as person, i (i)}<li class="card p-3 wrap-anywhere">{person.name} <span class="text-text-muted">— {person.slot} · {person.status === 'WITHDRAWN' ? m.shifts_withdrawn() : m.shifts_registered()}</span></li>{/each}</ul></section>{/if}
        {#if shift.drivers.length}<section><h2 class="mb-3 font-semibold">{m.shifts_driver_history()}</h2><ul class="flex flex-wrap gap-2">{#each shift.drivers as person (person.robloxId)}<li><a href="https://www.roblox.com/users/{person.robloxId}/profile" class="card block px-3 py-2 text-sm">{person.name}</a></li>{/each}</ul></section>{/if}
    {/if}
</div>
