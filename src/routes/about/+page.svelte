<script lang="ts">
	import PageHeader from '$lib/components/ui/PageHeader.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import { API_URL } from '$lib/api/client';
	import { m } from '$lib/paraglide/messages.js';
</script>

<svelte:head>
	<title>{m.about_about_trp_tools()}</title>
	<meta name="description" content="What TrP Tools is and how it works." />
</svelte:head>

<div class="mx-auto max-w-2xl px-4 py-10">
	<PageHeader title={m.common_about()} description={m.about_what_how_works()} />

	<div class="space-y-6">
		<Card title={m.common_trp_tools()}>
			<p class="text-sm leading-relaxed text-text-muted">
				{m.about_trp_tools_makes_running_roblox_transit()}
			</p>
		</Card>

		<Card title={m.about_how_access_works()}>
			<p class="text-sm leading-relaxed text-text-muted">
				{m.about_sign_with_roblox_permissions_come_from()}
			</p>
		</Card>

		<Card title="API">
			<p class="text-sm leading-relaxed text-text-muted">
				{m.about_everything_site_does_runs_through_documented()}
			</p>
			<p class="mt-3 text-sm">
				<a
					href="{API_URL}/docs"
					target="_blank"
					rel="noopener noreferrer"
					class="text-accent hover:underline"
				>
					{m.about_read_api_documentation()}
				</a>
			</p>
		</Card>
	</div>
</div>
