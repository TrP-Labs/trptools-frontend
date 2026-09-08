<script lang="ts">
	import ObjectPage, { type ObjectSection } from '$lib/components/layout/ObjectPage.svelte';
	import PageSection from '$lib/components/settings/PageSection.svelte';
	import VisibilitySection from '$lib/components/settings/VisibilitySection.svelte';
	import ShiftsSection from '$lib/components/settings/ShiftsSection.svelte';
	import AuditSection from '$lib/components/settings/AuditSection.svelte';
	import OpenCloudSection from '$lib/components/settings/OpenCloudSection.svelte';
	import VehicleTypesCard from '$lib/components/dispatch/VehicleTypesCard.svelte';
	import { can } from '$lib/utils/permissions';
	import { settingsSections } from '$lib/utils/settingsSections';
	import type { PageProps } from './$types';
	import { m } from '$lib/paraglide/messages.js';

	let { data }: PageProps = $props();

	let group = $derived(data.group);

	/**
	 * Only the parts this rank holds.
	 *
	 * Settings used to be one column of stacked cards, which meant a rank
	 * given one job — keeping the vehicle table, say — opened a page of
	 * controls it could not save. Sections carry their own grant, and the
	 * first one the viewer holds is the address they land on.
	 */
	let sections = $derived<ObjectSection[]>(
		settingsSections()
			.filter((section) => can(group.permissions, section.permission))
			.map(({ id, label, icon }) => ({ id, label, icon }))
	);
</script>

<ObjectPage
	title={m.common_settings()}
	description={m.dashboard_settings_how_group_appears_how_trp_tools()}
	{sections}
>
	{#snippet children(section)}
		{#if section === 'page'}
			<PageSection {group} />
		{:else if section === 'visibility'}
			<VisibilitySection {group} />
		{:else if section === 'shifts'}
			<ShiftsSection {group} />
		{:else if section === 'vehicles'}
			<VehicleTypesCard groupId={group.id} types={data.vehicleTypes} />
		{:else if section === 'opencloud'}
			<OpenCloudSection {group} />
		{:else if section === 'audit'}
			<AuditSection audit={data.audit} />
		{/if}
	{/snippet}
</ObjectPage>
