<script lang="ts">
	import { page } from '$app/state';
	import Button from '$lib/components/ui/Button.svelte';
	import { m } from '$lib/paraglide/messages.js';

	// Called rather than stored, so a client-side language change redraws these
	// along with everything else on the page.
	const titles: Record<number, () => string> = {
		403: m.error_no_access,
		404: m.error_page_not_found,
		500: m.common_something_went_wrong,
		502: m.error_api_unreachable
	};

	let title = $derived((titles[page.status] ?? m.common_something_went_wrong)());
</script>

<svelte:head><title>{title} — TrP Tools</title></svelte:head>

<div class="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-4 text-center">
	<p class="font-mono text-5xl font-semibold text-text-subtle tabular-nums">{page.status}</p>
	<h1 class="mt-4 text-xl font-semibold text-text">{title}</h1>

	{#if page.error?.message && page.error.message !== title}
		<p class="mt-2 text-sm text-text-muted">{page.error.message}</p>
	{/if}

	<div class="mt-6 flex gap-2">
		<Button href="/" variant="secondary">{m.home_go_home()}</Button>
		<Button href="/dashboard">{m.common_dashboard()}</Button>
	</div>
</div>
