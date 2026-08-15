<script lang="ts">
	import { page } from '$app/state';
	import { IconExternalLink, IconMenu2, IconX } from '@tabler/icons-svelte';
	import UserMenu from './UserMenu.svelte';
	import type { SessionUser } from '$lib/api/types';

	interface Props {
		user: SessionUser | null;
	}

	let { user }: Props = $props();

	let mobileOpen = $state(false);

	const links = [
		{ href: '/groups', label: 'Groups' },
		{ href: '/shifts', label: 'Shifts' },
		{ href: '/tools', label: 'Tools' },
		{ href: '/dashboard', label: 'Dashboard' }
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
			<span
				class="grid size-7 place-items-center rounded-lg bg-accent text-sm font-bold text-accent-contrast"
			>
				T
			</span>
			<span class="hidden sm:block">TrP Tools</span>
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
				Wiki <IconExternalLink size={13} />
			</a>
		</nav>

		<div class="ml-auto flex items-center gap-1">
			<UserMenu {user} />

			<button
				type="button"
				onclick={() => (mobileOpen = !mobileOpen)}
				aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
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
				Wiki <IconExternalLink size={13} />
			</a>
		</nav>
	{/if}
</header>
