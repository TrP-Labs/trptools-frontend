<script lang="ts">
	import { page } from '$app/state';
	import { IconAlertTriangle } from '@tabler/icons-svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import { loginUrl } from '$lib/api/client';
	import { formatDateTime } from '$lib/utils/format';

	let denied = $derived(page.url.searchParams.get('error') === 'denied');
	let suspended = $derived(page.url.searchParams.get('error') === 'banned');
	/** Present when the suspension is temporary. */
	let until = $derived(page.url.searchParams.get('until'));
	let next = $derived(page.url.searchParams.get('next') ?? '/dashboard');
</script>

<svelte:head><title>Sign in — TrP Tools</title></svelte:head>

<div class="mx-auto flex min-h-[70vh] max-w-sm flex-col justify-center px-4 py-10">
	<div class="card p-6 text-center">
		<img src="/logo.svg" alt="" width="48" height="48" class="mx-auto size-12 rounded-xl" />

		<h1 class="mt-4 text-xl font-semibold text-text">Sign in to TrP Tools</h1>
		<p class="mt-2 text-sm text-text-muted">
			TrP Tools uses your Roblox account. Your group ranks decide what you can do, so there is
			nothing else to set up.
		</p>

		{#if denied}
			<p
				class="mt-4 flex items-center justify-center gap-2 rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger"
			>
				<IconAlertTriangle size={16} /> Sign in was cancelled.
			</p>
		{:else if suspended}
			<div
				class="mt-4 rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger"
			>
				<p class="flex items-center justify-center gap-2 font-medium">
					<IconAlertTriangle size={16} /> This account is suspended.
				</p>
				<p class="mt-1 text-danger/85">
					{#if until}
						You can sign in again from {formatDateTime(until)}.
					{:else}
						Contact the site administrators if you think this is a mistake.
					{/if}
				</p>
			</div>
		{/if}

		<Button href={loginUrl()} data-sveltekit-reload size="lg" full class="mt-6">
			Continue with Roblox
		</Button>

		<p class="mt-4 text-xs text-text-subtle">
			We request permission to read your group membership so ranks can be checked.
		</p>
	</div>

	{#if next !== '/dashboard'}
		<p class="mt-4 text-center text-xs text-text-subtle">You will return to {next} afterwards.</p>
	{/if}
</div>
