<script lang="ts">
	/**
	 * Pasting the game's vehicle list into a board.
	 *
	 * Reconciling rather than replacing: vehicles missing from the paste have
	 * been deleted in game and go, vehicles already here keep everything a
	 * dispatcher has done to them. Which list each one belongs in is re-read
	 * on every import, so a misfiled vehicle can be fixed in settings and put
	 * right here without closing the room.
	 *
	 * The paste is parsed and checked here; where it *goes* is the caller's,
	 * because a group's room takes it over the API and the personal board at
	 * `/tools/dispatch` keeps it in the browser.
	 */
	import { tick } from 'svelte';
	import Modal from '$lib/components/ui/Modal.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Field from '$lib/components/ui/Field.svelte';
	import Textarea from '$lib/components/ui/Textarea.svelte';
	import { errorMessage } from '$lib/api/client';
	import { toasts } from '$lib/stores/toast.svelte';

	interface Props {
		open: boolean;
		/** Takes the parsed list and reports what the board did with it. */
		onsubmit: (vehicles: unknown[]) => Promise<{ added: number; removed: number; total: number }>;
	}

	let { open = $bindable(), onsubmit }: Props = $props();

	let text = $state('');
	let importing = $state(false);
	let field = $state<HTMLTextAreaElement | null>(null);

	/**
	 * The cursor starts in the box.
	 *
	 * `<dialog>` hands focus to the first focusable thing it contains, which is
	 * the close button in the header — so a dialog whose entire purpose is a
	 * paste opened with nothing to paste into, and you had to click first. The
	 * tick is because the dialog is shown by an effect of its own; there is
	 * nothing to focus until that has run.
	 */
	$effect(() => {
		if (!open) return;
		tick().then(() => field?.focus());
	});

	async function submit() {
		let parsed: unknown;
		try {
			parsed = JSON.parse(text);
		} catch {
			toasts.error('That is not valid JSON');
			return;
		}

		if (!Array.isArray(parsed)) {
			toasts.error('The JSON must be an array of vehicles');
			return;
		}

		importing = true;
		try {
			const result = await onsubmit(parsed);

			toasts.success(`Added ${result.added}, removed ${result.removed}, now tracking ${result.total}`);
			open = false;
			text = '';
		} catch (error) {
			toasts.error(errorMessage(error, 'Could not import those vehicles'));
		} finally {
			importing = false;
		}
	}
</script>

<Modal
	bind:open
	title="Import vehicles"
	description="Paste the vehicle JSON from the game. Vehicles missing from the list are removed; existing ones keep their assignments."
	size="lg"
>
	<Field label="Vehicle JSON">
		<Textarea
			bind:element={field}
			bind:value={text}
			rows={10}
			spellcheck="false"
			class="font-mono text-xs"
			placeholder={'[{"Id":101,"OwnerId":1,"Name":"ZiU-9 Trolleybus","Depot":"Main Island Depot"}]'}
		/>
	</Field>

	{#snippet footer()}
		<Button variant="secondary" onclick={() => (open = false)}>Cancel</Button>
		<Button onclick={submit} loading={importing} disabled={!text.trim()}>Import</Button>
	{/snippet}
</Modal>
