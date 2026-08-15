<script lang="ts">
	import '../app.css';
	import Header from '$lib/components/layout/Header.svelte';
	import Toaster from '$lib/components/ui/Toaster.svelte';
	import ReportDialog from '$lib/components/moderation/ReportDialog.svelte';
	import type { LayoutProps } from './$types';

	let { data, children }: LayoutProps = $props();
</script>

<svelte:head>
	<title>TrP Tools</title>
	<meta
		name="description"
		content="Group management, shift scheduling and multi-user dispatch for TrP."
	/>
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
			<p>TrP Tools</p>
			<nav class="flex flex-wrap gap-4">
				<a href="/about" class="transition-colors hover:text-text">About</a>
				{#if data.legal.privacy}
					<a href="/privacy" class="transition-colors hover:text-text">Privacy Policy</a>
				{/if}
				{#if data.legal.terms}
					<a href="/terms" class="transition-colors hover:text-text">Terms Of Service</a>
				{/if}
			</nav>
		</div>
	</footer>
</div>

<ReportDialog signedIn={Boolean(data.user)} />
<Toaster />
