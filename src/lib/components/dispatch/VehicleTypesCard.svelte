<script lang="ts">
	/**
	 * Which dispatch list each vehicle model belongs in.
	 *
	 * The legacy dispatcher decided this in code, which is why a group that
	 * added a tram had no way to say what it was. Here it is a table the group
	 * owns: a name exactly as the game reports it, and the list it goes in.
	 *
	 * Decorative vehicles are deliberately absent — scenery is recognised by
	 * having no owner, which is a fact about the vehicle in the room rather
	 * than about its model, and the same model can be both.
	 */
	import { IconPlus, IconTrash } from '@tabler/icons-svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import CustomSelect from '$lib/components/ui/CustomSelect.svelte';
	import { refreshData } from '$lib/utils/refresh';
	import { api, errorMessage } from '$lib/api/client';
	import { toasts } from '$lib/stores/toast.svelte';
	import { VEHICLE_CATEGORY_LABELS } from '$lib/api/types';
	import type { DispatchVehicle, VehicleType } from '$lib/api/types';

	interface Props {
		groupId: string;
		types: VehicleType[];
	}

	let { groupId, types }: Props = $props();

	type Category = DispatchVehicle['category'];
	type Row = { name: string; category: Category };

	/**
	 * `OTHER` is what a vehicle nobody has classified falls back to, and it
	 * shows in the same list as a classified one. Offering it as a choice would
	 * be offering two names for one outcome, so a stored `OTHER` is read as the
	 * ordinary vehicle it behaves as.
	 */
	function seed(): Row[] {
		return types.map((type) => ({
			name: type.name,
			category: type.category === 'OTHER' ? 'TROLLEYBUS' : type.category
		}));
	}

	let rows = $state(seed());
	let saving = $state(false);

	const options: Array<{ value: Category; label: string }> = (
		['TROLLEYBUS', 'SERVICE', 'STAFF'] as const
	).map((category) => ({ value: category, label: VEHICLE_CATEGORY_LABELS[category] }));

	let duplicate = $derived.by(() => {
		const seen = new Set<string>();
		for (const row of rows) {
			const key = row.name.trim().toLowerCase();
			if (!key) continue;
			if (seen.has(key)) return row.name.trim();
			seen.add(key);
		}
		return null;
	});

	function add() {
		rows.push({ name: '', category: 'TROLLEYBUS' });
	}

	async function save() {
		const payload = rows
			.map((row) => ({ name: row.name.trim(), category: row.category }))
			.filter((row) => row.name.length > 0);

		saving = true;
		try {
			const { error } = await api.groups({ groupId })['vehicle-types'].put({ types: payload });
			if (error) throw error;

			toasts.success('Vehicle types saved');
		} catch (error) {
			toasts.error(errorMessage(error, 'Could not save those vehicle types'));
			saving = false;
			return;
		}

		saving = false;

		// Never inside the try above: a hiccup refreshing must not be reported
		// as a failure to save something that has already been written.
		await refreshData();
		rows = seed();
	}
</script>

<Card
	title="Vehicles"
	description="Which list each vehicle appears in on the dispatch board. Names must match the game exactly; anything not listed is guessed from its name."
>
	{#snippet actions()}
		<Button onclick={save} loading={saving} disabled={Boolean(duplicate)}>Save</Button>
	{/snippet}

	<div class="space-y-2">
		{#each rows as row, index (index)}
			<div class="flex flex-wrap items-center gap-2">
				<Input
					bind:value={rows[index]!.name}
					maxlength={120}
					spellcheck="false"
					placeholder="Vehicle name as the game reports it"
					class="min-w-48 flex-1"
				/>

				<CustomSelect
					bind:value={rows[index]!.category}
					{options}
					ariaLabel="List for {row.name || 'this vehicle'}"
					class="w-44"
				/>

				<button
					type="button"
					aria-label="Remove {row.name || 'this vehicle'}"
					onclick={() => rows.splice(index, 1)}
					class="rounded-md p-1.5 text-text-subtle transition-colors hover:text-danger"
				>
					<IconTrash size={16} />
				</button>
			</div>
		{/each}

		{#if rows.length === 0}
			<p class="text-sm text-text-muted">
				No vehicles classified yet — every vehicle will be guessed from its name.
			</p>
		{/if}

		{#if duplicate}
			<p class="text-sm text-danger">
				“{duplicate}” is listed twice. Remove one before saving.
			</p>
		{/if}

		<Button variant="secondary" onclick={add}>
			<IconPlus size={16} /> Add vehicle
		</Button>
	</div>
</Card>
