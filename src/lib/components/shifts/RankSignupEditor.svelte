<script lang="ts">
	import { refreshData } from '$lib/utils/refresh';
	import { IconClipboardList, IconPlus, IconTrash } from '@tabler/icons-svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Field from '$lib/components/ui/Field.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import Toggle from '$lib/components/ui/Toggle.svelte';
	import ColorInput from '$lib/components/ui/ColorInput.svelte';
	import EmptyState from '$lib/components/ui/EmptyState.svelte';
	import { api, errorMessage } from '$lib/api/client';
	import { toasts } from '$lib/stores/toast.svelte';
	import type { RankSignup } from '$lib/api/types';

	/**
	 * One rank's sign-up sheet.
	 *
	 * Sheets belong to ranks rather than to shifts, so this is where they are
	 * defined once and every shift picks them up. Where the sheet is posted in
	 * Discord is a separate section of the rank's page — a group with no bot
	 * has a working sheet and simply nowhere to post it.
	 */
	interface Props {
		rankId: string;
		rankName: string;
		rankColor: string;
		signup: RankSignup | null;
	}

	let { rankId, rankName, rankColor, signup }: Props = $props();

	let busy = $state(false);

	/**
	 * Slots are edited locally and saved together.
	 *
	 * A per-keystroke save would rename a slot letter by letter, and the API
	 * matches slots by name to keep existing sign-ups attached — so a partial
	 * name would orphan them.
	 */
	let draftSlots = $state<Array<{ name: string; description: string; capacity: number }>>([]);
	let dirty = $state(false);

	/**
	 * The server is the source of truth right up until someone starts typing.
	 *
	 * Saving anything else on the sheet reloads the page data, and without
	 * this the draft would keep showing whatever it held when the component
	 * was first created. Unsaved edits win, so a reload cannot discard them.
	 */
	$effect(() => {
		const incoming = signup?.slots ?? [];
		if (dirty) return;

		draftSlots = incoming.map((slot) => ({
			name: slot.name,
			description: slot.description,
			capacity: slot.capacity
		}));
	});

	async function save(patch: Record<string, unknown>) {
		busy = true;
		try {
			const { error } = await api.ranks({ rankId }).signup.put(patch);
			if (error) throw error;
			await refreshData();
		} catch (error) {
			toasts.error(errorMessage(error, 'Could not save the sign-up sheet'));
		} finally {
			busy = false;
		}
	}

	async function saveSlots() {
		await save({
			slots: draftSlots
				.filter((slot) => slot.name.trim())
				.map((slot, index) => ({
					name: slot.name.trim(),
					description: slot.description,
					capacity: slot.capacity,
					order: index
				}))
		});

		dirty = false;
		toasts.success('Sign-up slots saved');
	}

	async function removeSheet() {
		if (!confirm(`Remove the ${rankName} sign-up sheet? Sign-ups already made against it go too.`))
			return;

		busy = true;
		try {
			const { error } = await api.ranks({ rankId }).signup.delete();
			if (error) throw error;

			toasts.success('Sign-up sheet removed');
			await refreshData();
		} catch (error) {
			toasts.error(errorMessage(error, 'Could not remove the sheet'));
		} finally {
			busy = false;
		}
	}

	function addSlot() {
		draftSlots = [...draftSlots, { name: '', description: '', capacity: 1 }];
		dirty = true;
	}

	function removeSlot(index: number) {
		draftSlots = draftSlots.filter((_, position) => position !== index);
		dirty = true;
	}
</script>

{#if !signup}
	<EmptyState
		title="No sign-up sheet"
		description="Slots people at this rank or above can take on any shift. Nobody below {rankName} ever sees it."
	>
		{#snippet icon()}<IconClipboardList size={28} stroke={1.5} />{/snippet}
		{#snippet action()}
			<Button
				size="sm"
				disabled={busy}
				onclick={() => save({ enabled: true, name: rankName, color: rankColor })}
			>
				<IconPlus size={15} /> Add a sheet
			</Button>
		{/snippet}
	</EmptyState>
{:else}
	<div class="space-y-4">
		<Toggle
			checked={signup.enabled}
			label="Open for sign-ups"
			description="Turning this off hides the sheet everywhere without deleting it."
			disabled={busy}
			onchange={(enabled) => save({ enabled })}
		/>

		<div class="grid gap-3 sm:grid-cols-[1fr_auto]">
			<Field label="Sheet name" hint="Shown as the heading on the shift page and in Discord.">
				<Input
					value={signup.name}
					maxlength={60}
					disabled={busy}
					onblur={(event) => {
						const next = (event.currentTarget as HTMLInputElement).value.trim();
						if (next && next !== signup.name) save({ name: next });
					}}
				/>
			</Field>

			<Field label="Colour">
				<ColorInput value={signup.color} disabled={busy} oncommit={(color) => save({ color })} />
			</Field>
		</div>

		<Field label="Description" hint="Optional, shown under the heading.">
			<Input
				value={signup.description}
				maxlength={300}
				disabled={busy}
				placeholder="e.g. Runs the shift from the dispatch room."
				onblur={(event) => {
					const next = (event.currentTarget as HTMLInputElement).value;
					if (next !== signup.description) save({ description: next });
				}}
			/>
		</Field>

		<div>
			<div class="mb-2 flex items-center justify-between">
				<span class="text-xs font-semibold tracking-wide text-text-muted uppercase">Slots</span>
				<Button size="sm" variant="ghost" onclick={addSlot} disabled={busy}>
					<IconPlus size={15} /> Add slot
				</Button>
			</div>

			{#if draftSlots.length === 0}
				<p
					class="rounded-lg border border-dashed border-border-base px-3 py-4 text-center text-sm text-text-muted"
				>
					No slots yet. A sheet with no slots is not shown to anyone.
				</p>
			{:else}
				<ul class="space-y-2">
					{#each draftSlots as slot, index (index)}
						<li
							class="flex flex-wrap items-end gap-2 rounded-lg border border-border-base bg-background-secondary p-3"
						>
							<div class="min-w-32 flex-1">
								<Field label="Name">
									<Input
										bind:value={slot.name}
										maxlength={60}
										placeholder="e.g. Dispatcher"
										oninput={() => (dirty = true)}
									/>
								</Field>
							</div>
							<div class="min-w-40 flex-[2]">
								<Field label="Description">
									<Input
										bind:value={slot.description}
										maxlength={300}
										placeholder="Optional"
										oninput={() => (dirty = true)}
									/>
								</Field>
							</div>
							<div class="w-24">
								<Field label="Spaces">
									<Input
										type="number"
										min="1"
										max="100"
										bind:value={slot.capacity}
										oninput={() => (dirty = true)}
									/>
								</Field>
							</div>
							<button
								type="button"
								onclick={() => removeSlot(index)}
								aria-label="Remove slot"
								class="mb-1.5 rounded-lg p-2 text-text-subtle transition-colors hover:text-danger"
							>
								<IconTrash size={16} />
							</button>
						</li>
					{/each}
				</ul>
			{/if}

			{#if dirty}
				<div class="mt-2">
					<Button size="sm" onclick={saveSlots} loading={busy}>Save slots</Button>
				</div>
			{/if}
		</div>

		<div class="flex justify-end border-t border-border-base pt-3">
			<Button size="sm" variant="ghost" onclick={removeSheet} disabled={busy}>
				<IconTrash size={15} /> Remove sheet
			</Button>
		</div>
	</div>
{/if}
