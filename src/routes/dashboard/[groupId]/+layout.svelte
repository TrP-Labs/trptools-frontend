<script lang="ts">
	import {
		IconBrandDiscord,
		IconBuildingWarehouse,
		IconCalendarTime,
		IconClipboardText,
		IconExternalLink,
		IconHome,
		IconRadio,
		IconRoute,
		IconSettings,
		IconUsers
	} from '@tabler/icons-svelte';
	import Sidebar, { type SidebarItem } from '$lib/components/layout/Sidebar.svelte';
	import Avatar from '$lib/components/users/Avatar.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import type { LayoutProps } from './$types';

	let { data, children }: LayoutProps = $props();

	let group = $derived(data.group);

	// Linked by slug rather than id so a group owner can hand a dispatcher a
	// readable URL. The API resolves either.
	let base = $derived(`/dashboard/${group.slug}`);

	let items = $derived<SidebarItem[]>([
		{ href: base, label: 'Overview', icon: IconHome, exact: true },
		{ href: `${base}/dispatch`, label: 'Dispatch', icon: IconRadio, level: 1 },
		{ href: `${base}/shifts`, label: 'Shifts', icon: IconCalendarTime, level: 1 },
		{ href: `${base}/routes`, label: 'Routes', icon: IconRoute, level: 3 },
		{ href: `${base}/depots`, label: 'Depots', icon: IconBuildingWarehouse, level: 3 },
		{ href: `${base}/ranks`, label: 'Ranks', icon: IconUsers, level: 3 },
		{ href: `${base}/applications`, label: 'Applications', icon: IconClipboardText, level: 3 },
		{ href: `${base}/bot`, label: 'Bot', icon: IconBrandDiscord, level: 3 },
		{ href: `${base}/settings`, label: 'Settings', icon: IconSettings, level: 3 }
	]);
</script>

<svelte:head><title>{group.name} — TrP Tools</title></svelte:head>

<div class="border-b border-border-base bg-surface">
	<div class="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-4">
		<Avatar src={group.icon} name={group.name} size={40} class="rounded-xl" />

		<div class="min-w-0 flex-1">
			<h1 class="truncate font-semibold text-text">{group.name}</h1>
			<p class="text-xs text-text-muted">
				{group.visibility === 'PUBLIC'
					? 'Public page'
					: group.visibility === 'UNLISTED'
						? 'Unlisted page'
						: 'Private'}
			</p>
		</div>

		{#if group.visibility !== 'PRIVATE'}
			<a
				href="/g/{group.slug}"
				class="inline-flex items-center gap-1.5 rounded-lg border border-border-base px-3 py-1.5
					text-sm text-text-muted transition-colors hover:text-text"
			>
				View public page <IconExternalLink size={14} />
			</a>
		{/if}

		{#if !group.hasOpenCloudKey && group.permissionLevel >= 3}
			<Badge tone="warning">No Open Cloud key</Badge>
		{/if}
	</div>
</div>

<div class="mx-auto flex max-w-7xl flex-col md:flex-row">
	<Sidebar title="Manage" {items} permissionLevel={group.permissionLevel} />

	<div class="min-w-0 flex-1 px-4 py-8">
		{@render children()}
	</div>
</div>
