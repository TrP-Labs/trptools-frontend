<script lang="ts">
	import { IconBan, IconCrown, IconHeadphones, IconMicrophone } from '@tabler/icons-svelte';
	import Toggle from '$lib/components/ui/Toggle.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import {
		ALL_PERMISSIONS,
		can,
		LEVEL_PERMISSIONS,
		PERM,
		permissionGroups
	} from '$lib/utils/permissions';
	import { permissionLabel } from '$lib/api/types';
	import { m } from '$lib/paraglide/messages.js';

	/**
	 * What one rank may do, a grant at a time.
	 *
	 * The four levels said what a rank *was*, so every screen the dashboard
	 * grew had to be filed under one of them — which is how configuring the
	 * Discord bot, editing the route list and holding the group's Open Cloud
	 * key ended up behind a single switch. The levels are still here as
	 * presets, because they are what most groups actually want and what every
	 * existing rank was set with.
	 */
	interface Props {
		permissions: number;
		/** What the person editing holds, so the list can say what they cannot grant. */
		editorPermissions: number;
		/** The Roblox owner role keeps everything; its switches are read-only. */
		locked?: boolean;
		busy?: boolean;
		onchange: (permissions: number) => void;
	}

	let { permissions, editorPermissions, locked = false, busy = false, onchange }: Props = $props();

	let groups = $derived(permissionGroups());
	let isAdministrator = $derived(can(permissions, PERM.ADMINISTRATOR));

	const presets = [
		{ level: 0, icon: IconBan },
		{ level: 1, icon: IconHeadphones },
		{ level: 2, icon: IconMicrophone },
		{ level: 3, icon: IconCrown }
	];

	/**
	 * Whether the editor may change this switch at all.
	 *
	 * The API refuses to let anybody hand out more than they hold themselves,
	 * so a switch they could not save is shown disabled rather than left to
	 * fail on submit. Administrator is the exception in the other direction:
	 * holding it means holding everything.
	 */
	function editable(flag: number): boolean {
		if (locked || busy) return false;
		return can(editorPermissions, flag);
	}

	function toggle(flag: number, on: boolean) {
		onchange(on ? permissions | flag : permissions & ~flag);
	}

	/** A preset the editor cannot fully grant is not offered. */
	function presetAvailable(level: number): boolean {
		if (locked || busy) return false;
		const wanted = LEVEL_PERMISSIONS[level] ?? 0;
		return (wanted & ~editorPermissions) === 0 || can(editorPermissions, PERM.ADMINISTRATOR);
	}
</script>

<div class="space-y-6">
	<div>
		<p class="mb-2 text-xs font-semibold tracking-wide text-text-muted uppercase">
			{m.permissions_presets()}
		</p>

		<div class="flex flex-wrap items-center gap-1">
			{#each presets as preset (preset.level)}
				{@const wanted = LEVEL_PERMISSIONS[preset.level] ?? 0}
				{@const active = permissions === wanted}
				<button
					type="button"
					disabled={!presetAvailable(preset.level)}
					aria-pressed={active}
					onclick={() => onchange(wanted)}
					class="inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm transition-colors
						disabled:cursor-not-allowed disabled:opacity-50
						{active
						? 'border-accent bg-accent/15 text-accent'
						: 'border-border-base text-text-subtle hover:text-text'}"
				>
					<preset.icon size={17} />
					{permissionLabel(preset.level)}
				</button>
			{/each}
		</div>

		<p class="mt-2 text-xs text-text-subtle">{m.permissions_presets_hint()}</p>
	</div>

	{#each groups as group (group.id)}
		<div class="space-y-3">
			<div class="flex items-baseline gap-2.5 border-b border-border-base pb-1.5">
				<h3 class="text-xs font-semibold tracking-wide text-text-muted uppercase">
					{group.label}
				</h3>
			</div>

			<div class="space-y-3.5">
				{#each group.permissions as permission (permission.flag)}
					{@const held = can(permissions, permission.flag)}
					{@const implied = isAdministrator && permission.flag !== PERM.ADMINISTRATOR}
					<div class="flex items-start gap-3">
						<div class="min-w-0 flex-1">
							<Toggle
								checked={held}
								label={permission.label}
								description={permission.description}
								disabled={!editable(permission.flag) || implied}
								onchange={(on) => toggle(permission.flag, on)}
							/>

							{#if implied}
								<p class="mt-1 text-xs text-text-subtle">{m.permissions_implied_by_admin()}</p>
							{:else if !locked && !can(editorPermissions, permission.flag)}
								<p class="mt-1 text-xs text-text-subtle">{m.permissions_not_yours_to_grant()}</p>
							{/if}
						</div>
					</div>
				{/each}
			</div>
		</div>
	{/each}

	{#if locked}
		<p class="text-xs text-text-subtle">{m.dashboard_ranks_owner_rank_always_keeps_full_access()}</p>
	{:else if permissions === ALL_PERMISSIONS || isAdministrator}
		<Badge tone="warning">{m.permissions_administrator_warning()}</Badge>
	{/if}
</div>
