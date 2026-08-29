<script lang="ts">
	import { goto } from '$app/navigation';
	import { refreshData } from '$lib/utils/refresh';
	import {
		IconBan,
		IconBrandDiscord,
		IconClipboardList,
		IconCrown,
		IconHeadphones,
		IconMicrophone,
		IconRefresh,
		IconSettings,
		IconShieldLock,
		IconTrash
	} from '@tabler/icons-svelte';
	import ObjectPage, { type ObjectSection } from '$lib/components/layout/ObjectPage.svelte';
	import RankSignupEditor from '$lib/components/shifts/RankSignupEditor.svelte';
	import RankSignupDiscord from '$lib/components/shifts/RankSignupDiscord.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import Field from '$lib/components/ui/Field.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import Toggle from '$lib/components/ui/Toggle.svelte';
	import ColorInput from '$lib/components/ui/ColorInput.svelte';
	import { api, errorMessage } from '$lib/api/client';
	import { toasts } from '$lib/stores/toast.svelte';
	import { PERMISSION_DESCRIPTIONS, PERMISSION_LABELS } from '$lib/api/types';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	let group = $derived(data.group);
	let rank = $derived(data.rank);
	let base = $derived(`/dashboard/${group.slug}/ranks`);

	/** The Roblox owner role always keeps full control (see the permission model). */
	let isOwner = $derived(rank.cachedRank === 255);

	let busy = $state(false);

	const levels = [
		{ level: 0, icon: IconBan },
		{ level: 1, icon: IconHeadphones },
		{ level: 2, icon: IconMicrophone },
		{ level: 3, icon: IconCrown }
	];

	let sections = $derived<ObjectSection[]>([
		{ id: 'permissions', label: 'Permissions', icon: IconShieldLock },
		{ id: 'settings', label: 'Rank settings', icon: IconSettings },
		{ id: 'signups', label: 'Sign-ups', icon: IconClipboardList },
		{ id: 'discord', label: 'Discord', icon: IconBrandDiscord }
	]);

	async function patch(body: Record<string, unknown>, success?: string) {
		busy = true;
		try {
			const { error } = await api.ranks({ rankId: rank.id }).patch(body);
			if (error) throw error;

			if (success) toasts.success(success);
			await refreshData();
		} catch (error) {
			toasts.error(errorMessage(error, 'Could not update that rank'));
		} finally {
			busy = false;
		}
	}

	async function unbind() {
		if (!confirm(`Unbind “${rank.cachedName}”? Members holding it will lose TrP Tools access.`))
			return;

		busy = true;
		try {
			const { error } = await api.ranks({ rankId: rank.id }).delete();
			if (error) throw error;

			toasts.success('Rank unbound');
			await goto(base);
		} catch (error) {
			toasts.error(errorMessage(error, 'Could not unbind that rank'));
		} finally {
			busy = false;
		}
	}
</script>

<ObjectPage
	backHref={base}
	backLabel="Ranks"
	title={rank.cachedName}
	description={PERMISSION_DESCRIPTIONS[rank.permissionLevel]}
	accent={rank.color}
	{sections}
>
	{#snippet meta()}
		{#if isOwner}<Badge tone="accent">Owner</Badge>{/if}
		<Badge>Rank {rank.cachedRank}</Badge>
		<Badge tone={rank.permissionLevel > 0 ? 'accent' : undefined}>
			{PERMISSION_LABELS[rank.permissionLevel]}
		</Badge>
		{#if rank.visible}<Badge>On staff list</Badge>{/if}
	{/snippet}

	{#snippet actions()}
		<Button
			size="sm"
			variant="secondary"
			disabled={busy}
			onclick={() => patch({ refresh: true }, 'Refreshed from Roblox')}
		>
			<IconRefresh size={15} /> Refresh from Roblox
		</Button>

		{#if !isOwner}
			<Button size="sm" variant="ghost" disabled={busy} onclick={unbind}>
				<IconTrash size={15} /> Unbind
			</Button>
		{/if}
	{/snippet}

	{#snippet children(section)}
		{#if section === 'permissions'}
			<Card title="Access" description="What members holding this rank can do here.">
				<div class="flex flex-wrap items-center gap-1">
					{#each levels as option (option.level)}
						{@const active = rank.permissionLevel === option.level}
						<button
							type="button"
							disabled={isOwner || busy}
							title={PERMISSION_DESCRIPTIONS[option.level]}
							aria-pressed={active}
							onclick={() => patch({ permissionLevel: option.level })}
							class="inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm transition-colors
								disabled:cursor-not-allowed disabled:opacity-50
								{active
								? 'border-accent bg-accent/15 text-accent'
								: 'border-border-base text-text-subtle hover:text-text'}"
						>
							<option.icon size={17} />
							{PERMISSION_LABELS[option.level]}
						</button>
					{/each}
				</div>

				<p class="mt-3 text-sm text-text-muted">
					{PERMISSION_DESCRIPTIONS[rank.permissionLevel]}
				</p>

				{#if isOwner}
					<p class="mt-2 text-xs text-text-subtle">
						The owner rank always keeps full access, so it cannot be changed here.
					</p>
				{/if}
			</Card>
		{:else if section === 'settings'}
			<Card title="Staff list" description="How this rank appears on the group's public page.">
				<div class="space-y-4">
					<Toggle
						checked={rank.visible}
						label="Show on the public staff list"
						description="Lists this rank and the people holding it on your public page."
						disabled={busy}
						onchange={(visible) => patch({ visible })}
					/>

					<div class="grid gap-4 sm:grid-cols-[1fr_auto]">
						<Field label="Description" hint="Shown under this rank on the public staff list.">
							<Input
								value={rank.description}
								maxlength={300}
								disabled={busy}
								placeholder="e.g. Drives assigned routes on shift."
								onblur={(event) => {
									const next = (event.currentTarget as HTMLInputElement).value;
									if (next !== rank.description) patch({ description: next });
								}}
							/>
						</Field>

						<Field label="Colour">
							<ColorInput
								value={rank.color}
								disabled={busy}
								oncommit={(color) => patch({ color })}
							/>
						</Field>
					</div>
				</div>
			</Card>
		{:else if section === 'signups'}
			<Card
				title="Sign-up sheet"
				description="Slots people at this rank or above can take on any shift."
			>
				<RankSignupEditor
					rankId={rank.id}
					rankName={rank.cachedName}
					rankColor={rank.color}
					signup={data.signup}
				/>
			</Card>
		{:else if section === 'discord'}
			<Card title="Discord" description="Where this rank's sheet is posted, if you run the bot.">
				<RankSignupDiscord
					groupId={group.id}
					groupSlug={group.slug}
					rankId={rank.id}
					signup={data.signup}
					botConnected={data.botConnected}
					channelNames={data.channelNames}
					roleNames={data.roleNames}
				/>
			</Card>
		{/if}
	{/snippet}
</ObjectPage>
