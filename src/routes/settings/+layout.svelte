<script lang="ts">
	import { IconKey, IconPalette, IconUser } from '@tabler/icons-svelte';
	import Sidebar, { type SidebarItem } from '$lib/components/layout/Sidebar.svelte';
	import type { LayoutProps } from './$types';
	import { m } from '$lib/paraglide/messages.js';

	let { data, children }: LayoutProps = $props();

	/**
	 * Signed out, appearance is the only page here that means anything, and the
	 * other two are not offered rather than offered and then refused — a rail
	 * of links that all bounce to /login is worse than a rail with one link on
	 * it. Both of those pages guard themselves as well; this only decides what
	 * is drawn.
	 */
	let items = $derived<SidebarItem[]>(
		data.user
			? [
					{ href: '/settings', label: m.common_account(), icon: IconUser, exact: true },
					{ href: '/settings/appearance', label: m.settings_appearance(), icon: IconPalette },
					{ href: '/settings/api-keys', label: m.settings_api_keys(), icon: IconKey }
				]
			: [{ href: '/settings/appearance', label: m.settings_appearance(), icon: IconPalette }]
	);
</script>

<svelte:head><title>{m.settings_settings_trp_tools()}</title></svelte:head>

<div class="mx-auto flex max-w-5xl flex-col md:flex-row">
	<!--
		With one entry the rail is a label for where you are rather than a
		choice, and a 240px column holding a single link leaves the page
		hanging off to one side. Signed out it goes, and the page centers.
	-->
	{#if items.length > 1}
		<Sidebar title={m.common_settings()} {items} />
	{/if}

	<div class="min-w-0 flex-1 px-4 py-8">
		{@render children()}
	</div>
</div>
