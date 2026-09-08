<script lang="ts">
	import { refreshData } from '$lib/utils/refresh';
	import Card from '$lib/components/ui/Card.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Field from '$lib/components/ui/Field.svelte';
	import Select from '$lib/components/ui/Select.svelte';
	import Toggle from '$lib/components/ui/Toggle.svelte';
	import { api, errorMessage } from '$lib/api/client';
	import { toasts } from '$lib/stores/toast.svelte';
	import type { Visibility } from '$lib/api/types';
	import { m } from '$lib/paraglide/messages.js';

	/** Who can see the group, and which parts of its page it shows them. */
	interface Props {
		group: {
			id: string;
			slug: string;
			visibility: Visibility;
			showRoutes: boolean;
			showShifts: boolean;
			showRoster: boolean;
		};
	}

	let { group }: Props = $props();

	let form = $state(seed());

	function seed() {
		return {
			visibility: group.visibility,
			showRoutes: group.showRoutes,
			showShifts: group.showShifts,
			showRoster: group.showRoster
		};
	}

	let saving = $state(false);

	const visibilities = [
		{ value: 'PUBLIC' as const, label: m.dashboard_settings_public_listed_directory() },
		{ value: 'UNLISTED' as const, label: m.dashboard_settings_unlisted_reachable_by_direct_link_only() },
		{ value: 'PRIVATE' as const, label: m.dashboard_settings_private_members_only() }
	];

	async function save() {
		saving = true;
		try {
			const { error } = await api.groups({ groupId: group.id }).patch({ ...form });
			if (error) throw error;

			toasts.success(m.dashboard_settings_settings_saved());
			await refreshData();
			form = seed();
		} catch (error) {
			toasts.error(errorMessage(error, m.dashboard_settings_could_not_save_those_settings()));
		} finally {
			saving = false;
		}
	}
</script>

<Card title={m.common_visibility()} description={m.dashboard_settings_visibility_description()}>
	<div class="space-y-5">
		<Field label={m.common_visibility()}>
			<Select bind:value={form.visibility} options={visibilities} />
		</Field>

		<div class="space-y-3">
			<Toggle
				bind:checked={form.showRoutes}
				label={m.dashboard_settings_show_routes()}
				description={m.dashboard_settings_list_public_routes_page()}
			/>
			<Toggle
				bind:checked={form.showShifts}
				label={m.dashboard_settings_show_shifts()}
				description={m.dashboard_settings_list_upcoming_public_shifts()}
			/>
			<Toggle
				bind:checked={form.showRoster}
				label={m.dashboard_settings_show_staff_list()}
				description={m.dashboard_settings_list_ranks_marked_visible()}
			/>
		</div>

		{#if form.visibility !== 'PRIVATE'}
			<a
				href="/g/{group.slug}"
				class="inline-block text-sm text-accent hover:underline"
			>
				{m.dashboard_view_public_page()}
			</a>
		{/if}
	</div>

	{#snippet actions()}
		<Button onclick={save} loading={saving}>{m.common_save()}</Button>
	{/snippet}
</Card>
