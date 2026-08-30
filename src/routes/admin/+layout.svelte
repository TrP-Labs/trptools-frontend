<script lang="ts">
	import { page } from '$app/state';
	import PageHeader from '$lib/components/ui/PageHeader.svelte';
	import type { LayoutProps } from './$types';
	import { m } from '$lib/paraglide/messages.js';

	let { children }: LayoutProps = $props();

	const tabs = [
		{ href: '/admin', label: m.admin_reports() },
		{ href: '/admin/users', label: m.admin_accounts() }
	];

	let current = $derived(page.url.pathname.replace(/\/$/, '') || '/admin');
</script>

<svelte:head><title>{m.admin_administration_trp_tools()}</title></svelte:head>

<div class="mx-auto max-w-5xl px-4 py-10">
	<PageHeader
		title={m.admin_administration()}
		description={m.admin_site_wide_moderation_reported_content_hidden()}
	/>

	<nav class="mb-6 flex gap-1.5">
		{#each tabs as tab (tab.href)}
			<a
				href={tab.href}
				aria-current={current === tab.href ? 'page' : undefined}
				class="rounded-lg border px-3 py-1.5 text-sm transition-colors
					{current === tab.href
					? 'border-accent bg-accent/15 text-accent'
					: 'border-border-base bg-background-secondary text-text-muted hover:text-text'}"
			>
				{tab.label}
			</a>
		{/each}
	</nav>

	{@render children()}
</div>
