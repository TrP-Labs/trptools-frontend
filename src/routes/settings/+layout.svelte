<script lang="ts">
	import { IconKey, IconPalette, IconUser } from '@tabler/icons-svelte';
	import Sidebar, { type SidebarItem } from '$lib/components/layout/Sidebar.svelte';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();

	const items: SidebarItem[] = [
		{ href: '/settings', label: 'Account', icon: IconUser, exact: true },
		{ href: '/settings/appearance', label: 'Appearance', icon: IconPalette },
		{ href: '/settings/api-keys', label: 'API keys', icon: IconKey }
	];
</script>

<svelte:head><title>Settings — TrP Tools</title></svelte:head>

<div class="mx-auto flex max-w-5xl flex-col md:flex-row">
	<Sidebar title="Settings" {items} />

	<div class="min-w-0 flex-1 px-4 py-8">
		{@render children()}
	</div>
</div>
