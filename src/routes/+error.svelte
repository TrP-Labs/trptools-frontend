<script lang="ts">
	import { page } from '$app/state';
	import Button from '$lib/components/ui/Button.svelte';

	const titles: Record<number, string> = {
		403: 'You do not have access',
		404: 'Page not found',
		500: 'Something went wrong',
		502: 'The API is unreachable'
	};

	let title = $derived(titles[page.status] ?? 'Something went wrong');
</script>

<svelte:head><title>{title} — TrP Tools</title></svelte:head>

<div class="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-4 text-center">
	<p class="font-mono text-5xl font-semibold text-text-subtle tabular-nums">{page.status}</p>
	<h1 class="mt-4 text-xl font-semibold text-text">{title}</h1>

	{#if page.error?.message && page.error.message !== title}
		<p class="mt-2 text-sm text-text-muted">{page.error.message}</p>
	{/if}

	<div class="mt-6 flex gap-2">
		<Button href="/" variant="secondary">Go home</Button>
		<Button href="/dashboard">Dashboard</Button>
	</div>
</div>
