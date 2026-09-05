<script lang="ts">
	import { page } from '$app/state';
	import { IconAlertTriangle } from '@tabler/icons-svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import { loginUrl } from '$lib/api/client';
	import { formatDateTime } from '$lib/utils/format';
	import { m } from '$lib/paraglide/messages.js';

	let denied = $derived(page.url.searchParams.get('error') === 'denied');
	let suspended = $derived(page.url.searchParams.get('error') === 'banned');
	/** Present when the suspension is temporary. */
	let until = $derived(page.url.searchParams.get('until'));
	let next = $derived(page.url.searchParams.get('next') ?? '/dashboard');
</script>

<svelte:head><title>{m.login_sign_trp_tools()}</title></svelte:head>

<div class="mx-auto flex min-h-[70vh] max-w-sm flex-col justify-center px-4 py-10">
	<div class="card p-6 text-center">
		<img src="/logo.svg" alt="" width="48" height="48" class="mx-auto size-12 rounded-xl" />

		<h1 class="mt-4 text-xl font-semibold text-text">{m.login_sign_trp_tools_2()}</h1>
		<p class="mt-2 text-sm text-text-muted">
			{m.login_trp_tools_uses_roblox_account_group()}
		</p>

		{#if denied}
			<p
				class="mt-4 flex items-center justify-center gap-2 rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger"
			>
				<IconAlertTriangle size={16} /> {m.login_sign_was_canceled()}
			</p>
		{:else if suspended}
			<div
				class="mt-4 rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger"
			>
				<p class="flex items-center justify-center gap-2 font-medium">
					<IconAlertTriangle size={16} /> {m.login_account_suspended()}
				</p>
				<p class="mt-1 text-danger/85">
					{#if until}
						{m.login_can_sign_in_again_from({ date: formatDateTime(until) })}
					{:else}
						{m.login_contact_the_site_administrators()}
					{/if}
				</p>
			</div>
		{/if}

		<Button href={loginUrl()} data-sveltekit-reload size="lg" full class="mt-6">
			{m.login_continue_with_roblox()}
		</Button>

		<p class="mt-4 text-xs text-text-subtle">
			{m.login_we_request_permission_read_group_membership()}
		</p>
	</div>

	{#if next !== '/dashboard'}
		<p class="mt-4 text-center text-xs text-text-subtle">
			{m.login_you_will_return_to({ page: next })}
		</p>
	{/if}
</div>
