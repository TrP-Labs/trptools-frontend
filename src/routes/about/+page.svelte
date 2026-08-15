<script lang="ts">
	import PageHeader from '$lib/components/ui/PageHeader.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import { API_URL } from '$lib/api/client';
</script>

<svelte:head>
	<title>About — TrP Tools</title>
	<meta name="description" content="What TrP Tools is and how it works." />
</svelte:head>

<div class="mx-auto max-w-2xl px-4 py-10">
	<PageHeader title="About" description="What this is and how it works." />

	<div class="space-y-6">
		<Card title="TrP Tools">
			<p class="text-sm leading-relaxed text-text-muted">
				TrP Tools makes running a Roblox transit group easier. It has been in continuous operation
				since 2023; this is version 2.0, a full rewrite built around multi-user dispatch, real
				shift scheduling and first-class support for custom routes.
			</p>
		</Card>

		<Card title="How access works">
			<p class="text-sm leading-relaxed text-text-muted">
				You sign in with Roblox, and your permissions come from the rank you hold in the group.
				Group managers map each Roblox role to one of four levels, so promoting somebody in your
				Roblox group is all it takes to give them access here. TrP Tools never stores a permission
				that Roblox does not still back.
			</p>
		</Card>

		<Card title="API">
			<p class="text-sm leading-relaxed text-text-muted">
				Everything the site does runs through a documented JSON API. Integrations authenticate with
				a scoped API key you can create in your settings.
			</p>
			<p class="mt-3 text-sm">
				<a
					href="{API_URL}/docs"
					target="_blank"
					rel="noopener noreferrer"
					class="text-accent hover:underline"
				>
					Read the API documentation
				</a>
			</p>
		</Card>
	</div>
</div>
