<script lang="ts">
	import {
		IconBrandDiscord,
		IconBuildingWarehouse,
		IconCalendarTime,
		IconClipboardList,
		IconClipboardText,
		IconExternalLink,
		IconHome,
		IconRadio,
		IconRoute,
		IconSettings,
		IconUsers
	} from '@tabler/icons-svelte';
	import Sidebar, { type SidebarItem } from '$lib/components/layout/Sidebar.svelte';
	import { can, PERM } from '$lib/utils/permissions';
	import { SETTINGS_GRANTS } from '$lib/utils/settingsSections';
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

	// Each entry names the grants that open it, so a rank given exactly one
	// job sees exactly that page rather than a rail of links to 403s.
	let items = $derived<SidebarItem[]>([
		{ href: base, label: m.dashboard_overview(), icon: IconHome, exact: true },
		{ href: `${base}/dispatch`, label: m.common_dispatch(), icon: IconRadio, permissions: [PERM.DISPATCH, PERM.START_ROOM] },
		// Shifts is the scheduling page and nothing else now, so it names the
		// grant that opens it rather than also admitting dispatchers, who used
		// to come here to sign up. Signing up happens on the group's public
		// shift page, where it is open to every member.
		{ href: `${base}/shifts`, label: m.common_shifts(), icon: IconCalendarTime, permissions: [PERM.MANAGE_SHIFTS] },
		{
			href: `${base}/signups`,
			label: m.common_signups(),
			icon: IconClipboardList,
			permissions: [PERM.MANAGE_SIGNUPS]
		},
		{ href: `${base}/routes`, label: m.common_routes(), icon: IconRoute, permissions: [PERM.MANAGE_ROUTES] },
		{ href: `${base}/depots`, label: m.common_depots(), icon: IconBuildingWarehouse, permissions: [PERM.MANAGE_DEPOTS] },
		{ href: `${base}/ranks`, label: m.common_ranks(), icon: IconUsers, permissions: [PERM.MANAGE_RANKS] },
		{
			href: `${base}/applications`,
			label: m.common_applications(),
			icon: IconClipboardText,
			permissions: [PERM.MANAGE_APPLICATIONS, PERM.REVIEW_APPLICATIONS]
		},
		{ href: `${base}/bot`, label: m.dashboard_bot(), icon: IconBrandDiscord, permissions: [PERM.MANAGE_BOT] },
		{
			href: `${base}/settings`,
			label: m.common_settings(),
			icon: IconSettings,
			permissions: SETTINGS_GRANTS
		}
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

		{#if !group.hasOpenCloudKey && can(group.permissions, PERM.MANAGE_OPEN_CLOUD)}
			<Badge tone="warning">{m.dashboard_no_open_cloud_key()}</Badge>
		{/if}
	</div>
</div>

<div class="mx-auto flex max-w-7xl flex-col md:flex-row">
	<Sidebar title={m.common_manage()} {items} permissions={group.permissions} />

	<div class="min-w-0 flex-1 px-4 py-8">
		{@render children()}
	</div>
</div>
