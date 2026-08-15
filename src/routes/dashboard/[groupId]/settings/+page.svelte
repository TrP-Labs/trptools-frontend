<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { IconCheck, IconExternalLink, IconKey } from '@tabler/icons-svelte';
	import PageHeader from '$lib/components/ui/PageHeader.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import Field from '$lib/components/ui/Field.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import Textarea from '$lib/components/ui/Textarea.svelte';
	import Select from '$lib/components/ui/Select.svelte';
	import Toggle from '$lib/components/ui/Toggle.svelte';
	import ColorInput from '$lib/components/ui/ColorInput.svelte';
	import Avatar from '$lib/components/users/Avatar.svelte';
	import IconUploader from '$lib/components/media/IconUploader.svelte';
	import { api, errorMessage } from '$lib/api/client';
	import { toasts } from '$lib/stores/toast.svelte';
	import { formatRelative } from '$lib/utils/format';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	let group = $derived(data.group);

	// Seeded from the loaded group, then owned by the form until saved. The
	// effect re-seeds it after a save invalidates, so the form always reflects
	// what the server actually stored.
	let form = $state(seed());

	function seed() {
		return {
			slug: group.slug,
			visibility: group.visibility,
			tagline: group.tagline,
			about: group.about,
			accentColor: group.accentColor,
			showRoutes: group.showRoutes,
			showShifts: group.showShifts,
			showRoster: group.showRoster,
			roomOpenLeadMinutes: group.roomOpenLeadMinutes
		};
	}

	let saving = $state(false);

	let apiKey = $state('');
	let keySaving = $state(false);

	const visibilities = [
		{ value: 'PUBLIC' as const, label: 'Public — listed in the directory' },
		{ value: 'UNLISTED' as const, label: 'Unlisted — reachable by direct link only' },
		{ value: 'PRIVATE' as const, label: 'Private — members only' }
	];

	async function save() {
		saving = true;
		try {
			const { error } = await api.groups({ groupId: group.id }).patch({
				...form,
				roomOpenLeadMinutes: Number(form.roomOpenLeadMinutes) || 0
			});
			if (error) throw error;

			toasts.success('Settings saved');
			await invalidateAll();
			form = seed();
		} catch (error) {
			toasts.error(errorMessage(error, 'Could not save those settings'));
		} finally {
			saving = false;
		}
	}

	async function saveKey() {
		keySaving = true;
		try {
			const { error } = await api
				.groups({ groupId: group.id })
				['open-cloud-key'].put({ apiKey: apiKey.trim() || null });
			if (error) throw error;

			toasts.success(apiKey.trim() ? 'Open Cloud key verified and stored' : 'Open Cloud key removed');
			apiKey = '';
			await invalidateAll();
		} catch (error) {
			toasts.error(errorMessage(error, 'That key could not read this group'));
		} finally {
			keySaving = false;
		}
	}
</script>

<PageHeader title="Settings" description="How this group appears and how TrP Tools talks to Roblox." />

<div class="space-y-6">
	<Card title="Public page" description="What people see at your group's TrP Tools address.">
		<div class="grid gap-4 sm:grid-cols-2">
			<Field label="Visibility" class="sm:col-span-2">
				<Select bind:value={form.visibility} options={visibilities} />
			</Field>

			<Field label="Page address" hint="Letters, numbers and dashes.">
				<div class="flex items-center gap-1.5">
					<span class="shrink-0 text-sm text-text-subtle">/g/</span>
					<Input bind:value={form.slug} maxlength={48} spellcheck="false" />
				</div>
			</Field>

			<Field label="Accent colour">
				<ColorInput bind:value={form.accentColor} />
			</Field>

			<Field label="Tagline" hint="One line, shown under the group name." class="sm:col-span-2">
				<Input bind:value={form.tagline} maxlength={160} placeholder="A short description" />
			</Field>

			<Field label="About" class="sm:col-span-2">
				<Textarea
					bind:value={form.about}
					rows={4}
					maxlength={4000}
					placeholder="Tell people what your group does."
				/>
			</Field>

			<div class="sm:col-span-2">
				<IconUploader
					groupId={group.id}
					ownerType="GROUP"
					current={group.bannerImage}
					label="Banner image"
					hint="Sits behind the group name on your public page. Wide images work best. Saved as soon as it uploads."
					aspect="wide"
				/>
			</div>

			<div class="space-y-3 sm:col-span-2">
				<Toggle bind:checked={form.showRoutes} label="Show routes" description="List public routes on the page." />
				<Toggle bind:checked={form.showShifts} label="Show shifts" description="List upcoming public shifts." />
				<Toggle bind:checked={form.showRoster} label="Show roster" description="List ranks marked visible." />
			</div>
		</div>

		{#snippet actions()}
			<Button onclick={save} loading={saving}>Save</Button>
		{/snippet}
	</Card>

	<Card title="Dispatch" description="How dispatch rooms behave for this group.">
		<Field
			label="Open rooms this many minutes early"
			hint="The dispatch page counts down to the next shift and unlocks its Open room button once the countdown falls inside this window. Set 0 to allow opening only once the shift has started."
		>
			<div class="flex items-center gap-3">
				<Input
					type="number"
					min="0"
					max="120"
					bind:value={form.roomOpenLeadMinutes}
					class="max-w-32"
				/>
				<span class="text-sm text-text-muted">minutes</span>
			</div>
		</Field>

		{#snippet actions()}
			<Button onclick={save} loading={saving}>Save</Button>
		{/snippet}
	</Card>

	<Card title="Roblox Open Cloud" description="How TrP Tools reads ranks for this group.">
		{#snippet actions()}
			{#if group.hasOpenCloudKey}
				<Badge tone="success"><IconCheck size={13} /> Connected</Badge>
			{:else}
				<Badge tone="warning">Not connected</Badge>
			{/if}
		{/snippet}

		<div class="space-y-4">
			<p class="text-sm leading-relaxed text-text-muted">
				Roblox Open Cloud will not answer group reads without credentials, and a signed-in user's
				own token is capped at well under a hundred requests a minute. A key that belongs to the
				group raises that ceiling considerably and keeps rank checks working even when nobody is
				signed in.
			</p>

			<ol class="list-decimal space-y-1.5 pl-5 text-sm text-text-muted">
				<li>
					Open
					<a
						href="https://create.roblox.com/dashboard/credentials"
						target="_blank"
						rel="noopener noreferrer"
						class="inline-flex items-center gap-1 text-accent hover:underline"
					>
						Creator Dashboard credentials <IconExternalLink size={12} />
					</a>
				</li>
				<li>Create an API key owned by this group, not by your account.</li>
				<li>
					Add the <span class="font-mono text-xs text-text">group:read</span> permission for this group.
				</li>
				<li>Paste the key below. It is verified against your group, then encrypted at rest.</li>
			</ol>

			<Field
				label={group.hasOpenCloudKey ? 'Replace key' : 'API key'}
				hint="Leave blank and save to remove an existing key."
			>
				<div class="flex flex-wrap gap-2">
					<Input
						bind:value={apiKey}
						type="password"
						autocomplete="off"
						spellcheck="false"
						placeholder="Paste your Open Cloud API key"
						class="min-w-56 flex-1"
					/>
					<Button onclick={saveKey} loading={keySaving}>
						<IconKey size={16} />
						{apiKey.trim() ? 'Verify and save' : 'Remove key'}
					</Button>
				</div>
			</Field>
		</div>
	</Card>

	<Card title="Recent activity" description="Administrative changes in this group.">
		{#if data.audit.length === 0}
			<p class="text-sm text-text-muted">Nothing recorded yet.</p>
		{:else}
			<ul class="divide-y divide-border-base">
				{#each data.audit.slice(0, 25) as entry (entry.id)}
					<li class="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5 first:pt-0 last:pb-0">
						<Avatar
							src={entry.actor?.avatar}
							name={entry.actor?.displayName ?? entry.actor?.username}
							size={22}
						/>
						<span class="text-sm font-medium text-text">
							{entry.actor?.displayName ?? entry.actor?.username ?? 'A removed account'}
						</span>
						<span class="min-w-0 flex-1 text-sm text-text-muted">{entry.summary}</span>
						<span class="shrink-0 text-xs text-text-subtle">{formatRelative(entry.date)}</span>
					</li>
				{/each}
			</ul>
		{/if}
	</Card>
</div>
