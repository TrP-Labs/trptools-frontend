<script lang="ts">
	import '../app.css';
	import Header from '$lib/components/layout/Header.svelte';
	import Toaster from '$lib/components/ui/Toaster.svelte';
	import ReportDialog from '$lib/components/moderation/ReportDialog.svelte';
	import type { LayoutProps } from './$types';
	import { m } from '$lib/paraglide/messages.js';

	let { data, children }: LayoutProps = $props();

	// Baked in by Vite so the running build can always be named, even in a
	// container where package.json is nowhere near the server bundle.
	const version = __APP_VERSION__;
</script>

<svelte:head>
	<title>{m.common_trp_tools()}</title>
	<meta name="description" content={m.layout_meta_description()} />
</svelte:head>

<div class="flex min-h-dvh flex-col">
	<Header user={data.user} />

	<main class="flex-1">
		{@render children()}
	</main>

	<footer class="border-t border-border-base py-6">
		<div
			class="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 text-xs text-text-subtle"
		>
			<p class="flex items-center gap-1.5">
				{m.common_trp_tools()}
				<span aria-hidden="true">·</span>
				<span class="font-mono">v{version}</span>
			</p>

			<!-- Every link here comes from a file in the policies directory. -->
			<nav class="flex flex-wrap gap-4">
				{#each data.policies as policy (policy.href)}
					<a
						href={policy.href}
						target={policy.external ? '_blank' : undefined}
						rel={policy.external ? 'noopener noreferrer' : undefined}
						class="transition-colors hover:text-text"
					>
						{policy.label}
					</a>
				{/each}
			</nav>
		</div>
	</footer>
</div>

<ReportDialog signedIn={Boolean(data.user)} />
<Toaster />
