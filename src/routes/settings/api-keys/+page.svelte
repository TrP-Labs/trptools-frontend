<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { IconCopy, IconKey, IconPlus, IconTrash } from '@tabler/icons-svelte';
	import PageHeader from '$lib/components/ui/PageHeader.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import Modal from '$lib/components/ui/Modal.svelte';
	import Field from '$lib/components/ui/Field.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import EmptyState from '$lib/components/ui/EmptyState.svelte';
	import { api, errorMessage } from '$lib/api/client';
	import { toasts } from '$lib/stores/toast.svelte';
	import { formatRelative } from '$lib/utils/format';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const SCOPES = [
		'groups:read',
		'groups:write',
		'routes:read',
		'routes:write',
		'schedule:read',
		'schedule:write',
		'dispatch:read',
		'dispatch:write'
	];

	let createOpen = $state(false);
	let name = $state('');
	let scopes = $state<string[]>(['groups:read', 'routes:read', 'schedule:read']);
	let creating = $state(false);

	let issued = $state<string | null>(null);

	function toggleScope(scope: string) {
		scopes = scopes.includes(scope) ? scopes.filter((value) => value !== scope) : [...scopes, scope];
	}

	async function create() {
		creating = true;
		try {
			const { data: key, error } = await api.auth.keys.post({ name: name.trim(), scopes });
			if (!key) throw error;

			issued = key.token;
			createOpen = false;
			name = '';
			await invalidateAll();
		} catch (error) {
			toasts.error(errorMessage(error, 'Could not create that key'));
		} finally {
			creating = false;
		}
	}

	async function revoke(keyId: string, label: string) {
		if (!confirm(`Revoke “${label}”? Anything using it will stop working immediately.`)) return;

		try {
			const { error } = await api.auth.keys({ keyId }).delete();
			if (error) throw error;

			toasts.success('Key revoked');
			await invalidateAll();
		} catch (error) {
			toasts.error(errorMessage(error, 'Could not revoke that key'));
		}
	}

	async function copy(value: string) {
		try {
			await navigator.clipboard.writeText(value);
			toasts.success('Copied');
		} catch {
			toasts.error('Could not copy — select it manually');
		}
	}
</script>

<PageHeader
	title="API keys"
	description="For integrations such as the TrP Tools Discord bot. Keys act as you."
>
	{#snippet actions()}
		<Button onclick={() => (createOpen = true)}><IconPlus size={16} /> New key</Button>
	{/snippet}
</PageHeader>

{#if data.keys.length === 0}
	<EmptyState title="No API keys" description="Create one to let an integration act on your behalf.">
		{#snippet icon()}<IconKey size={28} stroke={1.5} />{/snippet}
		{#snippet action()}
			<Button onclick={() => (createOpen = true)}><IconPlus size={16} /> New key</Button>
		{/snippet}
	</EmptyState>
{:else}
	<ul class="space-y-3">
		{#each data.keys as key (key.keyId)}
			<li class="card flex flex-wrap items-start gap-4 p-4">
				<div class="min-w-0 flex-1">
					<p class="font-medium text-text">{key.name}</p>
					<p class="mt-0.5 font-mono text-xs text-text-subtle">{key.prefix}…</p>

					<div class="mt-2 flex flex-wrap gap-1.5">
						{#each key.scopes as scope (scope)}
							<Badge>{scope}</Badge>
						{/each}
					</div>

					<p class="mt-2 text-xs text-text-subtle">
						Created {formatRelative(key.createdAt)}
						{#if key.lastUsedAt}· last used {formatRelative(key.lastUsedAt)}{:else}· never used{/if}
					</p>
				</div>

				<Button variant="ghost" onclick={() => revoke(key.keyId, key.name)}>
					<IconTrash size={16} /> Revoke
				</Button>
			</li>
		{/each}
	</ul>
{/if}

<Modal bind:open={createOpen} title="New API key" description="Grant only what the integration needs.">
	<div class="space-y-4">
		<Field label="Name" hint="So you can recognise it later.">
			<Input bind:value={name} maxlength={60} placeholder="e.g. Discord bot" />
		</Field>

		<Field label="Scopes">
			<div class="flex flex-wrap gap-1.5">
				{#each SCOPES as scope (scope)}
					{@const active = scopes.includes(scope)}
					<button
						type="button"
						onclick={() => toggleScope(scope)}
						aria-pressed={active}
						class="rounded-lg border px-2.5 py-1.5 font-mono text-xs transition-colors
							{active
							? 'border-accent bg-accent/15 text-accent'
							: 'border-border-base bg-background-secondary text-text-muted hover:text-text'}"
					>
						{scope}
					</button>
				{/each}
			</div>
		</Field>
	</div>

	{#snippet footer()}
		<Button variant="secondary" onclick={() => (createOpen = false)}>Cancel</Button>
		<Button onclick={create} loading={creating} disabled={!name.trim() || scopes.length === 0}>
			Create key
		</Button>
	{/snippet}
</Modal>

<Modal
	open={issued !== null}
	onclose={() => (issued = null)}
	title="Copy your key now"
	description="This is the only time it will be shown."
>
	<div class="flex gap-2">
		<code
			class="min-w-0 flex-1 rounded-lg border border-border-base bg-background-secondary px-3 py-2
				font-mono text-xs break-all text-text"
		>
			{issued}
		</code>
		<Button onclick={() => issued && copy(issued)}><IconCopy size={16} /></Button>
	</div>

	{#snippet footer()}
		<Button onclick={() => (issued = null)}>Done</Button>
	{/snippet}
</Modal>
