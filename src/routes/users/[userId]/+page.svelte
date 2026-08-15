<script lang="ts">
	import { IconExternalLink } from '@tabler/icons-svelte';
	import Avatar from '$lib/components/users/Avatar.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	let profile = $derived(data.profile);
	let name = $derived(profile.displayName ?? profile.username ?? `User ${profile.robloxId}`);
</script>

<svelte:head>
	<title>{name} — TrP Tools</title>
</svelte:head>

<div class="mx-auto max-w-2xl px-4 py-12">
	<div class="card flex flex-wrap items-center gap-5 p-6">
		<Avatar src={profile.avatar} {name} size={80} />

		<div class="min-w-0 flex-1">
			<h1 class="truncate text-2xl font-semibold text-text">{name}</h1>
			{#if profile.username && profile.username !== profile.displayName}
				<p class="text-sm text-text-muted">@{profile.username}</p>
			{/if}

			<div class="mt-3 flex flex-wrap items-center gap-2">
				{#if profile.siteRank !== 'user'}
					<Badge tone="accent" class="capitalize">{profile.siteRank}</Badge>
				{/if}
				<a
					href="https://www.roblox.com/users/{profile.robloxId}/profile"
					target="_blank"
					rel="noopener noreferrer"
					class="inline-flex items-center gap-1.5 rounded-full border border-border-base px-2.5 py-0.5
						text-xs text-text-muted transition-colors hover:text-text"
				>
					Roblox profile <IconExternalLink size={12} />
				</a>
			</div>
		</div>
	</div>
</div>
