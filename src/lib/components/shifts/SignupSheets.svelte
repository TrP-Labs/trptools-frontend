<script lang="ts">
	import { page } from '$app/state';
	import { refreshData } from '$lib/utils/refresh';
	import {
		IconArrowsExchange,
		IconBrandDiscord,
		IconLock,
		IconMinus,
		IconPlus,
		IconUserMinus
	} from '@tabler/icons-svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import MenuItem from '$lib/components/ui/MenuItem.svelte';
	import OverflowMenu from '$lib/components/ui/OverflowMenu.svelte';
	import Avatar from '$lib/components/users/Avatar.svelte';
	import { api, errorMessage } from '$lib/api/client';
	import { toasts } from '$lib/stores/toast.svelte';
	import { startDiscordLink } from '$lib/utils/discordLink';
	import { findMySlot, isMine, signupName } from '$lib/utils/signups';
	import { withAlpha } from '$lib/utils/color';
	import type { SignupSheet } from '$lib/api/types';
	import { m } from '$lib/paraglide/messages.js';
	import { localized } from '$lib/utils/translations';

	/**
	 * The sign-up sheets for one occurrence of a shift.
	 *
	 * Only slots the viewer may see ever arrive here — the API does the
	 * gating, per slot, so there is nothing to hide client-side. Someone at
	 * driver rank simply never learns the dispatcher slot exists.
	 *
	 * A slot that arrives is not always one they may *fill*: whoever holds the
	 * grant to move other people's sign-ups is shown every slot so they have
	 * somewhere to move them to. `canFill` is what the button asks.
	 */
	interface Props {
		sheets: SignupSheet[];
		eventId: string;
		occurrence: Date | string;
		/** The viewer, so their own rows can be marked and withdrawn. */
		userId?: string;
		/**
		 * Their connected Discord account, if any.
		 *
		 * A slot they took from a Discord sheet before connecting is recorded
		 * against that id rather than their account, and it is still theirs —
		 * so it is marked and withdrawn from here like any other.
		 */
		discordId?: string | null;
		/** Whether this group asks for a connected Discord account first. */
		discordRequired?: boolean;
		/** Whether this viewer has one. */
		discordLinked?: boolean;
		/** Whether they may move or remove other people's sign-ups. */
		canEdit?: boolean;
	}

	let {
		sheets,
		eventId,
		occurrence,
		userId,
		discordId = null,
		discordRequired = false,
		discordLinked = false,
		canEdit = false
	}: Props = $props();

	let busy = $state<string | null>(null);

	/**
	 * Whether the group's Discord rule is what stands between this viewer and
	 * a slot.
	 *
	 * The server refuses the sign-up either way — this only decides whether
	 * the page explains it beforehand instead of after a press. Withdrawing
	 * stays available throughout, deliberately: somebody who signed up and
	 * then disconnected, or whose group turned the rule on afterwards, still
	 * has to be able to take their name off a shift they cannot make.
	 */
	let blocked = $derived(Boolean(userId) && discordRequired && !discordLinked);

	let linking = $state(false);

	/** Every slot on this occurrence, for the "move to" menu. */
	let allSlots = $derived(
		sheets.flatMap((sheet) =>
			sheet.slots.map((slot) => ({
				id: slot.id,
				label: sheets.length > 1 ? `${sheet.name} · ${slot.name}` : slot.name,
				full: slot.signups.length >= slot.capacity
			}))
		)
	);

	/**
	 * Back to this same page afterwards, rather than to settings: somebody who
	 * pressed this to take a slot should land in front of the sheet they were
	 * looking at, with the button now live.
	 */
	async function connectDiscord() {
		linking = true;
		if (!(await startDiscordLink(page.url.pathname + page.url.search))) linking = false;
	}

	// Passed on as a Date, never a hand-made string: the backend matches an
	// occurrence on its exact timestamp, and `String(date)` drops milliseconds.
	let occurrenceDate = $derived(occurrence instanceof Date ? occurrence : new Date(occurrence));

	/** The slot this person already holds on this occurrence, if any. */
	let mySlot = $derived(findMySlot(sheets, userId, discordId));

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

	/**
	 * A host acting on somebody else's row.
	 *
	 * Addressed by the row's own id rather than by slot and identity: a signup
	 * made from Discord by somebody with no account has no user id to name,
	 * and reconstructing one here would put the rule in two places.
	 */
	async function manage(signupId: string, to: string | null) {
		busy = signupId;
		try {
			const { error } = to
				? await api.schedule.signup({ signupId }).patch({ slotId: to })
				: await api.schedule.signup({ signupId }).delete();

			if (error) throw error;

			toasts.success(to ? m.signups_moved() : m.signups_removed());
			await refreshData();
		} catch (error) {
			toasts.error(errorMessage(error, to ? m.signups_could_not_move() : m.signups_could_not_remove()));
		} finally {
			busy = null;
		}
	}
</script>

{#if sheets.length > 0}
	<div class="space-y-4">
		{#each sheets as sheet (sheet.sheetId)}
			<!--
				Deliberately not `overflow-hidden`, though the rounded corner
				asks for it: the host's menu is a popover inside this box, and
				clipping the box clips the menu to a few visible characters.
				The header rounds its own top corners instead.
			-->
			<section
				class="rounded-xl border border-border-base"
				style="border-left: 3px solid {sheet.color};"
			>
				<header
					class="flex flex-wrap items-center gap-2 rounded-t-[0.6875rem] border-b border-border-base px-4 py-3"
					style="background: {withAlpha(sheet.color, 0.08)};"
				>
					<div class="min-w-0 flex-1">
						<h3 class="text-sm font-semibold text-text">{localized(sheet, 'name')}</h3>
						{#if localized(sheet, 'description')}
							<p class="mt-0.5 text-xs text-text-muted">{localized(sheet, 'description')}</p>
						{/if}
					</div>
				</header>

				<ul class="divide-y divide-border-base">
					{#each sheet.slots as slot (slot.id)}
						{@const full = slot.signups.length >= slot.capacity}
						<li class="flex flex-wrap items-center gap-3 px-4 py-3">
							<div class="min-w-0 flex-1">
								<div class="flex flex-wrap items-center gap-2">
									<p class="text-sm font-medium text-text">{localized(slot, 'name')}</p>
									<Badge tone={full ? 'success' : 'neutral'}>
										{slot.signups.length}/{slot.capacity}
									</Badge>
									<!--
										Named only where it narrows something. A slot
										open to the whole group says nothing, because
										"anyone may take this" is what an unlabelled
										slot already looks like.
									-->
									{#if slot.rankNames.length > 0}
										<span class="text-xs text-text-subtle">{slot.rankNames.join(', ')}</span>
									{/if}
								</div>

								{#if localized(slot, 'description')}
									<p class="mt-0.5 text-xs text-text-muted">{localized(slot, 'description')}</p>
								{/if}

								{#if slot.signups.length > 0}
									<ul class="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5">
										{#each slot.signups as signup (signup.id)}
											<li class="flex items-center gap-1.5">
												{#if signup.userId}
													<Avatar src={signup.avatar} name={signupName(signup)} size={18} />
												{:else}
													<span class="text-text-subtle"><IconBrandDiscord size={14} /></span>
												{/if}
												<span class="text-xs text-text-muted">{signupName(signup)}</span>

												<!--
													The host's controls sit on the person
													rather than on the slot, because that
													is what they act on — and behind a
													menu, so a sheet of twelve drivers is
													still a list of names rather than a
													wall of buttons.
												-->
												{#if canEdit}
													<OverflowMenu
														align="left"
														label={m.signups_manage_signup({ name: signupName(signup) })}
													>
														{#snippet children(close)}
															{#each allSlots as target (target.id)}
																{#if target.id !== slot.id}
																	<MenuItem
																		disabled={target.full || busy !== null}
																		title={target.full ? m.shifts_signup_sheets_full() : undefined}
																		onclick={() => {
																			close();
																			void manage(signup.id, target.id);
																		}}
																	>
																		<IconArrowsExchange size={15} />
																		{m.signups_move_to({ slot: target.label })}
																	</MenuItem>
																{/if}
															{/each}

															<MenuItem
																tone="danger"
																disabled={busy !== null}
																onclick={() => {
																	close();
																	void manage(signup.id, null);
																}}
															>
																<IconUserMinus size={15} /> {m.signups_take_off_shift()}
															</MenuItem>
														{/snippet}
													</OverflowMenu>
												{/if}
											</li>
										{/each}
									</ul>
								{:else}
									<p class="mt-2 text-xs text-text-subtle">{m.shifts_signup_sheets_nobody_yet()}</p>
								{/if}
							</div>

							{#if userId}
								<div class="shrink-0">
									{#if slot.signups.some((signup) => isMine(signup, userId, discordId))}
										<Button
											size="sm"
											variant="secondary"
											loading={busy === slot.id}
											onclick={() => act(slot.id, false)}
										>
											<IconMinus size={14} /> {m.shifts_signup_sheets_withdraw()}
										</Button>
									{:else if !slot.canFill}
										<!--
											Only reachable by somebody who may move other
											people between slots: everybody else was never
											sent this slot. Saying why is the point — the
											row is there to be a destination, not an offer.
										-->
										<span
											class="flex items-center gap-1.5 text-xs text-text-subtle"
											title={m.signups_not_for_your_rank_hint()}
										>
											<IconLock size={13} /> {m.signups_not_for_your_rank()}
										</span>
									{:else}
										<Button
											size="sm"
											variant={full || mySlot || blocked ? 'ghost' : 'primary'}
											disabled={full || Boolean(mySlot) || blocked || busy !== null}
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

		<!--
			One notice for the whole shift rather than one per slot: the rule is
			about the reader, not about any particular slot, and repeating it
			down a sheet of four would drown the sheet itself.
		-->
		{#if blocked}
			<div class="card flex flex-wrap items-center gap-3 border-warning/40 p-3">
				<span class="text-text-subtle"><IconBrandDiscord size={18} /></span>
				<p class="min-w-0 flex-1 text-xs text-text-muted">
					{m.shifts_signup_sheets_discord_required()}
				</p>
				<Button size="sm" loading={linking} onclick={connectDiscord}>
					{m.shifts_signup_sheets_connect_discord()}
				</Button>
			</div>
		{:else if mySlot}
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
