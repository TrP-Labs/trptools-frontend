<script lang="ts">
	import { IconKey, IconPalette, IconUser } from '@tabler/icons-svelte';
	import Sidebar, { type SidebarItem } from '$lib/components/layout/Sidebar.svelte';
	import type { LayoutProps } from './$types';
	import { m } from '$lib/paraglide/messages.js';

	let { children }: LayoutProps = $props();

	const items: SidebarItem[] = [
		{ href: '/settings', label: m.common_account(), icon: IconUser, exact: true },
		{ href: '/settings/appearance', label: m.settings_appearance(), icon: IconPalette },
		{ href: '/settings/api-keys', label: m.settings_api_keys(), icon: IconKey }
	];
</script>

<svelte:head><title>{m.settings_settings_trp_tools()}</title></svelte:head>

<div class="mx-auto flex max-w-5xl flex-col md:flex-row">
	<Sidebar title={m.common_settings()} {items} />

	<div class="min-w-0 flex-1 px-4 py-8">
		{@render children()}
	</div>
</div>
