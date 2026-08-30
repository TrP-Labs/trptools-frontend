<script lang="ts">
	import { refreshData } from '$lib/utils/refresh';
	import { IconBrandDiscord, IconMinus, IconPlus } from '@tabler/icons-svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Avatar from '$lib/components/users/Avatar.svelte';
	import { api, errorMessage } from '$lib/api/client';
	import { toasts } from '$lib/stores/toast.svelte';
	import { signupName } from '$lib/utils/signups';
	import { withAlpha } from '$lib/utils/color';
	import type { SignupSheet } from '$lib/api/types';
	import { m } from '$lib/paraglide/messages.js';

	/**
	 * The sign-up sheets for one occurrence of a shift.
	 *
	 * Only sheets the viewer's rank reaches ever arrive here — the API does the
	 * gating, so there is nothing to hide client-side. Someone at driver rank
	 * simply never learns the dispatcher sheet exists.
	 */
	interface Props {
		sheets: SignupSheet[];
		eventId: string;
		occurrence: Date | string;
		/** The viewer, so their own rows can be marked and withdrawn. */
		userId?: string;
	}

	let { sheets, eventId, occurrence, userId }: Props = $props();

	let busy = $state<string | null>(null);

	// Passed on as a Date, never a hand-made string: the backend matches an
	// occurrence on its exact timestamp, and `String(date)` drops milliseconds.
	let occurrenceDate = $derived(occurrence instanceof Date ? occurrence : new Date(occurrence));

	/** The slot this person already holds on this occurrence, if any. */
	let mySlot = $derived.by(() => {
		if (!userId) return null;

		for (const sheet of sheets) {
			for (const slot of sheet.slots) {
				if (slot.signups.some((signup) => signup.userId === userId)) return slot.id;
			}
		}

		return null;
	});

	async function act(slotId: string, take: boolean) {
		busy = slotId;
		try {
			const body = { slotId, eventId, occurrence: occurrenceDate };
			const { error } = take
				? await api.schedule.signup.post(body)
				: await api.schedule.withdraw.post(body);

			if (error) throw error;

			toasts.success(take ? m.shifts_signup_sheets_signed_up() : m.shifts_signup_sheets_withdrawn());
			await refreshData();
		} catch (error) {
			toasts.error(errorMessage(
					error,
					take ? m.shifts_signup_sheets_could_not_sign_up() : m.shifts_signup_sheets_could_not_withdraw()
				));
		} finally {
			busy = null;
		}
	}
</script>

{#if sheets.length > 0}
	<div class="space-y-4">
		{#each sheets as sheet (sheet.signupId)}
			<section
				class="overflow-hidden rounded-xl border border-border-base"
				style="border-left: 3px solid {sheet.color};"
			>
				<header
					class="flex flex-wrap items-center gap-2 border-b border-border-base px-4 py-3"
					style="background: {withAlpha(sheet.color, 0.08)};"
				>
					<div class="min-w-0 flex-1">
						<h3 class="text-sm font-semibold text-text">{sheet.name}</h3>
						{#if sheet.description}
							<p class="mt-0.5 text-xs text-text-muted">{sheet.description}</p>
						{/if}
					</div>
					<Badge>{sheet.rankName} and above</Badge>
				</header>

				<ul class="divide-y divide-border-base">
					{#each sheet.slots as slot (slot.id)}
						{@const mine = slot.signups.some((signup) => signup.userId === userId)}
						{@const full = slot.signups.length >= slot.capacity}
						<li class="flex flex-wrap items-center gap-3 px-4 py-3">
							<div class="min-w-0 flex-1">
								<div class="flex flex-wrap items-center gap-2">
									<p class="text-sm font-medium text-text">{slot.name}</p>
									<Badge tone={full ? 'success' : 'neutral'}>
										{slot.signups.length}/{slot.capacity}
									</Badge>
								</div>

								{#if slot.description}
									<p class="mt-0.5 text-xs text-text-muted">{slot.description}</p>
								{/if}

								{#if slot.signups.length > 0}
									<ul class="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5">
										{#each slot.signups as signup (signup.userId || signup.discordId)}
											<li class="flex items-center gap-1.5">
												{#if signup.userId}
													<Avatar src={signup.avatar} name={signupName(signup)} size={18} />
												{:else}
													<span class="text-text-subtle"><IconBrandDiscord size={14} /></span>
												{/if}
												<span class="text-xs text-text-muted">{signupName(signup)}</span>
											</li>
										{/each}
									</ul>
								{:else}
									<p class="mt-2 text-xs text-text-subtle">{m.shifts_signup_sheets_nobody_yet()}</p>
								{/if}
							</div>

							{#if userId}
								<div class="shrink-0">
									{#if mine}
										<Button
											size="sm"
											variant="secondary"
											loading={busy === slot.id}
											onclick={() => act(slot.id, false)}
										>
											<IconMinus size={14} /> {m.shifts_signup_sheets_withdraw()}
										</Button>
									{:else}
										<Button
											size="sm"
											variant={full || mySlot ? 'ghost' : 'primary'}
											disabled={full || Boolean(mySlot) || busy !== null}
											loading={busy === slot.id}
											onclick={() => act(slot.id, true)}
										>
											<IconPlus size={14} />
											{full ? m.shifts_signup_sheets_full() : m.shifts_signup_sheets_sign_up()}
										</Button>
									{/if}
								</div>
							{/if}
						</li>
					{/each}
				</ul>
			</section>
		{/each}

		{#if mySlot}
			<p class="text-xs text-text-subtle">
				{m.shifts_signup_sheets_can_only_hold_one_slot_per()}
			</p>
		{/if}
	</div>
{/if}

<!--
	Nothing is rendered when there are no sheets, deliberately.

	Sign-ups are for specific staff roles — dispatchers, maintenance — so most
	people have none, on most shifts. Telling every one of them, on every
	occurrence, that a thing they cannot use is unavailable is noise about
	somebody else's job.
-->

