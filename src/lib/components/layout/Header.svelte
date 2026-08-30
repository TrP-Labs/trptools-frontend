<script lang="ts">
	import { page } from '$app/state';
	import { IconExternalLink, IconMenu2, IconShieldCheck, IconX } from '@tabler/icons-svelte';
	import UserMenu from './UserMenu.svelte';
	import type { SessionUser } from '$lib/api/types';
	import { m } from '$lib/paraglide/messages.js';

	interface Props {
		user: SessionUser | null;
	}

	let { user }: Props = $props();

	let mobileOpen = $state(false);

	const links = [
		{ href: '/groups', label: m.common_groups() },
		{ href: '/shifts', label: m.common_shifts() },
		{ href: '/tools', label: m.layout_header_tools() },
		{ href: '/dashboard', label: m.common_dashboard() }
	];

	let currentSection = $derived('/' + (page.url.pathname.split('/')[1] ?? ''));

	// Close the drawer whenever navigation completes.
	$effect(() => {
		page.url.pathname;
		mobileOpen = false;
	});
</script>

<header
	class="sticky top-0 z-40 border-b border-border-base bg-header/95 backdrop-blur supports-[backdrop-filter]:bg-header/80"
>
	<div class="mx-auto flex h-14 max-w-7xl items-center gap-2 px-4">
		<a href="/" class="flex shrink-0 items-center gap-2 font-semibold tracking-tight">
			<img src="/logo.svg" alt="" width="28" height="28" class="size-7 shrink-0 rounded-lg" />
			<span class="hidden sm:block">{m.common_trp_tools()}</span>
		</a>

		<nav class="ml-4 hidden items-center gap-1 md:flex">
			{#each links as link (link.href)}
				<a
					href={link.href}
					class="rounded-lg px-3 py-1.5 text-sm transition-colors
						{currentSection === link.href
						? 'bg-background-secondary font-medium text-text'
						: 'text-text-muted hover:text-text'}"
				>
					{link.label}
				</a>
			{/each}
			<a
				href="https://trolleybus.wiki"
				target="_blank"
				rel="noopener noreferrer"
				class="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-text-muted transition-colors hover:text-text"
			>
				{m.layout_header_wiki()} <IconExternalLink size={13} />
			</a>
		</nav>

		<div class="ml-auto flex items-center gap-1">
			<!--
				A standing marker, not a decoration. While admin mode is on
				every group permission is bypassed, so the whole site looks
				different from how it looks to everyone else — and without
				something on screen saying so, that difference gets mistaken
				for how the site behaves. It links to the switch.
			-->
			{#if user?.adminMode}
				<a
					href="/settings"
					title={m.layout_header_admin_mode_session()}
					class="mr-1 inline-flex items-center gap-1.5 rounded-full border border-warning/40 bg-warning/10
						px-2.5 py-1 text-xs font-medium text-warning transition-colors hover:bg-warning/20"
				>
					<IconShieldCheck size={13} />
					<span class="hidden sm:inline">{m.layout_header_admin_mode()}</span>
				</a>
			{/if}

			<UserMenu {user} />

			<button
				type="button"
				onclick={() => (mobileOpen = !mobileOpen)}
				aria-label={mobileOpen ? m.layout_header_close_menu() : m.layout_header_open_menu()}
				aria-expanded={mobileOpen}
				class="rounded-lg p-2 text-text-muted transition-colors hover:bg-background-secondary hover:text-text md:hidden"
			>
				{#if mobileOpen}<IconX size={20} />{:else}<IconMenu2 size={20} />{/if}
			</button>
		</div>
	</div>

	{#if mobileOpen}
		<nav class="border-t border-border-base bg-header px-4 py-2 md:hidden">
			{#each links as link (link.href)}
				<a
					href={link.href}
					class="block rounded-lg px-3 py-2.5 text-sm transition-colors
						{currentSection === link.href
						? 'bg-background-secondary font-medium text-text'
						: 'text-text-muted'}"
				>
					{link.label}
				</a>
			{/each}
			<a
				href="https://trolleybus.wiki"
				target="_blank"
				rel="noopener noreferrer"
				class="flex items-center gap-1.5 rounded-lg px-3 py-2.5 text-sm text-text-muted"
			>
				{m.layout_header_wiki()} <IconExternalLink size={13} />
			</a>
		</nav>
	{/if}
</header>
