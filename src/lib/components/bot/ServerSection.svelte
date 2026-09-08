<script lang="ts">
	import {
		IconAlertTriangle,
		IconBrandDiscord,
		IconCheck,
		IconPlugConnected,
		IconX
	} from '@tabler/icons-svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import type { BotGuildStatus } from '$lib/api/types';
	import { m } from '$lib/paraglide/messages.js';

	/**
	 * Which Discord server the bot is in, and whether it can actually work
	 * there.
	 *
	 * The first section because it is the one that answers "why is nothing
	 * happening": every other setting on this page is arranging messages that
	 * a bot missing a permission will never manage to post.
	 */
	interface Props {
		guild: BotGuildStatus;
		/** Re-runs the install, which is how a missing permission is regranted. */
		onreadd: () => void;
		installing: boolean;
	}

	let { guild, onreadd, installing }: Props = $props();
</script>

<div class="card p-4">
	<div class="flex flex-wrap items-center gap-3">
		{#if guild.icon}
			<img src={guild.icon} alt="" class="size-10 shrink-0 rounded-xl" />
		{:else}
			<span
				class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-background-muted text-text-subtle"
			>
				<IconBrandDiscord size={20} />
			</span>
		{/if}

		<div class="min-w-0 flex-1">
			<p class="truncate font-medium text-text">{guild.name ?? m.dashboard_bot_unknown_server()}</p>
			<p class="text-xs text-text-subtle">{guild.guildId}</p>
		</div>

		{#if !guild.present}
			<Badge tone="danger"><IconAlertTriangle size={13} /> {m.dashboard_bot_bot_removed()}</Badge>
		{:else if guild.healthy}
			<Badge tone="success"><IconPlugConnected size={13} /> {m.dashboard_bot_connected()}</Badge>
		{:else}
			<Badge tone="warning">
				<IconAlertTriangle size={13} />
				{m.dashboard_bot_missing_permissions()}
			</Badge>
		{/if}
	</div>

	<div class="mt-4 border-t border-border-base pt-4">
		<p class="mb-2 text-xs font-semibold tracking-wide text-text-muted uppercase">
			{m.dashboard_bot_permissions()}
		</p>

		<ul class="flex flex-wrap gap-x-4 gap-y-1.5">
			{#each guild.permissions as permission (permission.name)}
				<li class="flex items-center gap-1.5 text-sm">
					{#if permission.granted}
						<IconCheck size={14} class="shrink-0 text-success" />
						<span class="text-text-muted">{permission.label}</span>
					{:else}
						<IconX size={14} class="shrink-0 text-danger" />
						<span class="text-danger">{permission.label}</span>
					{/if}
				</li>
			{/each}
		</ul>

		{#if !guild.present}
			<p class="mt-3 text-sm text-text-muted">
				{m.dashboard_bot_discord_no_longer_reports_bot_as()}
			</p>
			<div class="mt-3">
				<Button size="sm" onclick={onreadd} loading={installing}>
					<IconBrandDiscord size={15} /> {m.dashboard_bot_add_discord_again()}
				</Button>
			</div>
		{:else if !guild.healthy}
			<p class="mt-3 text-sm text-text-muted">
				{m.dashboard_bot_bot_missing_permissions_needs_re_adding()}
			</p>
			<div class="mt-3">
				<Button size="sm" variant="secondary" onclick={onreadd} loading={installing}>
					<IconBrandDiscord size={15} /> {m.dashboard_bot_re_add_with_full_permissions()}
				</Button>
			</div>
		{/if}
	</div>
</div>
