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
	import { m } from '$lib/paraglide/messages.js';
	import { localized } from '$lib/utils/translations';

	let { data, children }: LayoutProps = $props();

	let group = $derived(data.group);

	// Linked by slug rather than id so a group owner can hand a dispatcher a
	// readable URL. The API resolves either.
	let base = $derived(`/dashboard/${group.slug}`);

	let items = $derived<SidebarItem[]>([
		{ href: base, label: m.dashboard_overview(), icon: IconHome, exact: true },
		{ href: `${base}/dispatch`, label: m.common_dispatch(), icon: IconRadio, level: 1 },
		{ href: `${base}/shifts`, label: m.common_shifts(), icon: IconCalendarTime, level: 1 },
		{ href: `${base}/routes`, label: m.common_routes(), icon: IconRoute, level: 3 },
		{ href: `${base}/depots`, label: m.common_depots(), icon: IconBuildingWarehouse, level: 3 },
		{ href: `${base}/ranks`, label: m.common_ranks(), icon: IconUsers, level: 3 },
		{ href: `${base}/applications`, label: m.common_applications(), icon: IconClipboardText, level: 3 },
		{ href: `${base}/bot`, label: m.dashboard_bot(), icon: IconBrandDiscord, level: 3 },
		{ href: `${base}/settings`, label: m.common_settings(), icon: IconSettings, level: 3 }
	]);
</script>

<svelte:head><title>{localized(group, 'name')} — TrP Tools</title></svelte:head>

<div class="border-b border-border-base bg-surface">
	<div class="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-4">
		<Avatar src={group.icon} name={localized(group, 'name')} size={40} class="rounded-xl" />

		<div class="min-w-0 flex-1">
			<h1 class="truncate font-semibold text-text">{localized(group, 'name')}</h1>
			<p class="text-xs text-text-muted">
				{group.visibility === 'PUBLIC'
					? m.common_public_page()
					: group.visibility === 'UNLISTED'
						? m.dashboard_unlisted_page()
						: m.dashboard_private()}
			</p>
		</div>

		{#if group.visibility !== 'PRIVATE'}
			<a
				href="/g/{group.slug}"
				class="inline-flex items-center gap-1.5 rounded-lg border border-border-base px-3 py-1.5
					text-sm text-text-muted transition-colors hover:text-text"
			>
				{m.dashboard_view_public_page()} <IconExternalLink size={14} />
			</a>
		{/if}

		{#if !group.hasOpenCloudKey && group.permissionLevel >= 3}
			<Badge tone="warning">{m.dashboard_no_open_cloud_key()}</Badge>
		{/if}
	</div>
</div>

<div class="mx-auto flex max-w-7xl flex-col md:flex-row">
	<Sidebar title={m.common_manage()} {items} permissionLevel={group.permissionLevel} />

	<div class="min-w-0 flex-1 px-4 py-8">
		{@render children()}
	</div>
</div>
