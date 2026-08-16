<script lang="ts">
	import { IconAt, IconHash, IconPencil } from '@tabler/icons-svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import ChannelPicker from './ChannelPicker.svelte';
	import RolePicker from './RolePicker.svelte';

	/**
	 * One channel-or-role setting: what it is currently set to, and a button
	 * that opens the matching picker.
	 *
	 * The name shown comes from a lookup the page already loaded rather than
	 * from a fetch here — a bot page carries eight of these, and eight
	 * independent reads of the same guild would be wasteful and would make the
	 * page flicker as each resolved.
	 */
	interface Props {
		groupId: string;
		kind: 'channel' | 'role';
		label: string;
		description?: string;
		value: string | null;
		/** Snowflake to display name, for whichever kind this is. */
		names?: Record<string, string>;
		disabled?: boolean;
		onchange: (value: string | null) => void;
	}

	let { groupId, kind, label, description, value, names = {}, disabled = false, onchange }: Props =
		$props();

	let open = $state(false);

	let display = $derived.by(() => {
		if (!value) return null;
		const name = names[value];
		if (!name) return kind === 'channel' ? 'Unknown channel' : 'Unknown role';
		return kind === 'channel' ? `#${name}` : `@${name}`;
	});

	// A stored id the guild no longer has means the channel or role was
	// deleted. Saying so is more useful than showing a bare snowflake.
	let missing = $derived(Boolean(value) && !names[value!]);
</script>

<div class="flex flex-wrap items-center gap-3 rounded-lg border border-border-base px-3 py-2.5">
	<span class="shrink-0 text-text-subtle">
		{#if kind === 'channel'}<IconHash size={16} />{:else}<IconAt size={16} />{/if}
	</span>

	<div class="min-w-0 flex-1">
		<p class="text-sm font-medium text-text">{label}</p>
		{#if description}
			<p class="mt-0.5 text-xs text-text-muted">{description}</p>
		{/if}
	</div>

	<div class="flex shrink-0 items-center gap-2">
		<span class="text-sm {missing ? 'text-danger' : display ? 'text-text' : 'text-text-subtle'}">
			{display ?? 'Not set'}
		</span>

		<Button size="sm" variant="secondary" {disabled} onclick={() => (open = true)}>
			<IconPencil size={14} /> Change
		</Button>
	</div>
</div>

{#if kind === 'channel'}
	<ChannelPicker
		bind:open
		{groupId}
		{value}
		title={label}
		description={description ?? undefined}
		onselect={onchange}
	/>
{:else}
	<RolePicker
		bind:open
		{groupId}
		{value}
		title={label}
		description={description ?? undefined}
		onselect={onchange}
	/>
{/if}
