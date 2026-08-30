<script lang="ts">
	import { IconEyeOff, IconLock, IconTrash } from '@tabler/icons-svelte';
	import RouteBadge from './RouteBadge.svelte';
	import Field from '$lib/components/ui/Field.svelte';
	import FieldGroup from '$lib/components/ui/FieldGroup.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import Textarea from '$lib/components/ui/Textarea.svelte';
	import Select from '$lib/components/ui/Select.svelte';
	import ColorInput from '$lib/components/ui/ColorInput.svelte';
	import Toggle from '$lib/components/ui/Toggle.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import ImageManager from '$lib/components/media/ImageManager.svelte';
	import IconUploader from '$lib/components/media/IconUploader.svelte';
	import { formatShare } from '$lib/utils/format';
	import type { Depot, MediaItem, RouteShape } from '$lib/api/types';
	import { m } from '$lib/paraglide/messages.js';

	export interface RouteDraft {
		name: string;
		description: string;
		color: string;
		textColor: string;
		shape: RouteShape;
		autoAssign: boolean;
		targetShare: number;
		visibility: 'PUBLIC' | 'UNLISTED' | 'PRIVATE';
		/** Whether the group's public page lists this route. */
		showOnGroupPage: boolean;
		archived: boolean;
		depots: string[];
	}

	interface Props {
		draft: RouteDraft;
		depots: Depot[];
		busy?: boolean;
		mode: 'create' | 'edit';
		builtIn?: boolean;
		/** Existing route id, so images can be attached. */
		routeId?: string;
		groupId?: string;
		images?: MediaItem[];
		/** The uploaded badge in place right now, if any. */
		icon?: string | null;
		onsave: () => void;
		ondelete?: () => void;
		onimageschanged?: () => void;
	}

	let {
		draft = $bindable(),
		depots,
		busy = false,
		mode,
		builtIn = false,
		routeId,
		groupId,
		images = [],
		icon = null,
		onsave,
		ondelete,
		onimageschanged
	}: Props = $props();

	const shapes = [
		{ value: 'AUTO' as const, label: m.routes_route_editor_automatic() },
		{ value: 'CIRCLE' as const, label: m.routes_route_editor_circle() },
		{ value: 'RECTANGLE' as const, label: m.routes_route_editor_rectangle() },
		{ value: 'DIAMOND' as const, label: m.routes_route_editor_diamond() },
		{ value: 'HEXAGON' as const, label: m.routes_route_editor_hexagon() }
	];

	const visibilities = [
		{ value: 'PUBLIC' as const, label: m.common_public() },
		{ value: 'PRIVATE' as const, label: m.common_members_only() }
	];

	/**
	 * The share settles when the box is left, not on every keystroke — typing
	 * "33.33" passes through "33." on the way, and rewriting the field mid-entry
	 * would eat the point. The value is always written back afterwards so a
	 * cleared or out-of-range box cannot sit there showing something the draft
	 * does not hold.
	 */
	function commitShare(event: Event & { currentTarget: HTMLInputElement }) {
		const typed = event.currentTarget.value.trim();
		const parsed = Number(typed);

		if (typed !== '' && Number.isFinite(parsed)) {
			draft.targetShare = Math.round(Math.min(100, Math.max(0, parsed)) * 100) / 100;
		}

		event.currentTarget.value = formatShare(draft.targetShare);
	}

	function toggleDepot(id: string) {
		draft.depots = draft.depots.includes(id)
			? draft.depots.filter((depot) => depot !== id)
			: [...draft.depots, id];
	}

	/** Nothing under "public page" can take effect once the route is private. */
	let published = $derived(draft.visibility === 'PUBLIC');
</script>

<div class="space-y-6">
	<FieldGroup title={m.routes_route_editor_route()} description={m.routes_route_editor_its_name_how_badge_drawn()} columns={1}>
		<div class="grid gap-5 sm:grid-cols-[auto_1fr]">
			<div class="flex flex-col items-center gap-2 sm:w-32">
				<RouteBadge
					label={draft.name || '??'}
					color={draft.color}
					textColor={draft.textColor}
					shape={draft.shape}
					{icon}
					size="lg"
				/>
				<p class="text-center text-xs text-text-subtle">
					{icon ? m.routes_route_editor_uploaded_badge() : m.routes_route_editor_live_preview()}
				</p>
			</div>

			<div class="grid gap-4 sm:grid-cols-2">
				<Field
					label={m.routes_route_editor_route_name()}
					hint={builtIn
						? m.routes_route_editor_built_routes_keep_name_game_uses()
						: m.routes_route_editor_must_match_route_name_game_up()}
				>
					<Input
						bind:value={draft.name}
						maxlength={24}
						disabled={builtIn}
						placeholder={m.routes_route_editor_e_g_14_express()}
					/>
				</Field>

				<Field label={m.routes_route_editor_shape()} hint={m.routes_route_editor_automatic_makes_short_names_round_long()}>
					<Select bind:value={draft.shape} options={shapes} />
				</Field>

				<Field label={m.routes_route_editor_route_colour()}>
					<ColorInput bind:value={draft.color} />
				</Field>

				<Field label={m.routes_route_editor_label_colour()} hint={m.routes_route_editor_ink_used_route_number_itself()}>
					<ColorInput bind:value={draft.textColor} />
				</Field>

				<Field label={m.common_description()} class="sm:col-span-2">
					<Textarea
						bind:value={draft.description}
						rows={2}
						maxlength={1000}
						placeholder={m.routes_route_editor_where_route_runs_anything_drivers_should()}
					/>
				</Field>
			</div>
		</div>

		{#if mode === 'edit' && routeId && groupId}
			<IconUploader
				{groupId}
				ownerType="ROUTE"
				ownerId={routeId}
				current={icon}
				label={m.routes_route_editor_route_badge()}
				hint={m.routes_route_editor_replaces_drawn_roundel_everywhere_route_appears()}
			/>
		{/if}
	</FieldGroup>

	<FieldGroup title={m.common_dispatch()} description={m.routes_route_editor_how_automatic_assignment_treats()} columns={1}>
		<Field
			label={m.routes_route_editor_depots_served()}
			hint={m.routes_route_editor_automatic_assignment_only_puts_vehicles_routes()}
		>
			{#if depots.length === 0}
				<p class="text-sm text-text-muted">{m.routes_route_editor_no_depots_configured_yet()}</p>
			{:else}
				<div class="flex flex-wrap gap-2">
					{#each depots as depot (depot.id)}
						{@const active = draft.depots.includes(depot.id)}
						<button
							type="button"
							onclick={() => toggleDepot(depot.id)}
							aria-pressed={active}
							class="min-w-0 max-w-full rounded-lg border px-3 py-1.5 text-left text-sm wrap-anywhere transition-colors
								{active
								? 'border-accent bg-accent/15 text-accent'
								: 'border-border-base bg-background-secondary text-text-muted hover:text-text'}"
						>
							<span class="font-mono text-xs opacity-70">{depot.number}</span>
							{depot.name}
						</button>
					{/each}
				</div>
			{/if}
		</Field>

		<Field
			label={m.routes_route_editor_target_share()}
			hint={m.routes_route_editor_portion_dispatchable_vehicles_route_should_carry()}
		>
			<div class="flex items-center gap-3">
				<input
					type="range"
					min="0"
					max="100"
					step="1"
					bind:value={draft.targetShare}
					aria-label={m.routes_route_editor_target_share()}
					class="h-1 flex-1 cursor-pointer appearance-none rounded-full bg-background-muted accent-accent"
				/>

				<div
					class="flex shrink-0 items-center rounded-lg border border-border-base bg-background-secondary
						focus-within:border-accent"
				>
					<input
						type="number"
						min="0"
						max="100"
						step="0.01"
						value={formatShare(draft.targetShare)}
						onchange={commitShare}
						onblur={commitShare}
						aria-label={m.routes_route_editor_target_share_percent()}
						class="w-20 bg-transparent py-2 pl-3 text-right font-mono text-sm text-text
							tabular-nums focus:outline-none
							[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none
							[&::-webkit-outer-spin-button]:appearance-none"
					/>
					<span class="pr-3 pl-1 font-mono text-sm text-text-muted select-none">%</span>
				</div>
			</div>
		</Field>

		<Toggle
			bind:checked={draft.autoAssign}
			label={m.routes_route_editor_include_automatic_assignment()}
			description={m.routes_route_editor_turn_off_routes_should_only_ever()}
		/>
	</FieldGroup>

	<FieldGroup title={m.common_public_page()} description={m.routes_route_editor_what_visitors_group_see()} columns={1}>
		<Field label={m.common_visibility()} hint={m.routes_route_editor_members_only_keeps_route_inside_dashboard()}>
			<Select bind:value={draft.visibility} options={visibilities} class="sm:max-w-64" />
		</Field>

		<Toggle
			bind:checked={draft.showOnGroupPage}
			disabled={!published}
			label={m.routes_route_editor_list_group_page()}
			description={published
				? m.routes_route_editor_off_keeps_route_at_its_own()
				: m.routes_route_editor_members_only_routes_never_appear_group()}
		/>

		{#if mode === 'edit' && routeId && groupId}
			<ImageManager
				{groupId}
				ownerType="ROUTE"
				ownerId={routeId}
				{images}
				label={m.routes_route_editor_route_maps()}
				hint={m.routes_route_editor_shown_public_page_up_12_images()}
				onchange={onimageschanged}
			/>
		{/if}
	</FieldGroup>

	{#if mode === 'edit'}
		<FieldGroup title={m.routes_route_editor_availability()} columns={1}>
			<Toggle
				bind:checked={draft.archived}
				label={m.common_disabled()}
				description={builtIn
					? m.routes_route_editor_hides_built_route_from_dispatch_public()
					: m.routes_route_editor_hidden_from_dispatch_public_pages_without()}
			/>
		</FieldGroup>
	{/if}

	<div class="flex flex-wrap items-center gap-2 border-t border-border-base pt-4">
		<Button onclick={onsave} loading={busy} disabled={!draft.name.trim()}>
			{mode === 'create' ? m.routes_route_editor_create_route() : m.common_save_changes()}
		</Button>

		{#if mode === 'edit'}
			{#if builtIn}
				<span class="inline-flex items-center gap-1.5 text-xs text-text-subtle">
					<IconLock size={14} /> {m.routes_route_editor_built_routes_can_disabled_but_not()}
				</span>
			{:else if ondelete}
				<Button variant="danger" onclick={ondelete} disabled={busy}>
					<IconTrash size={16} /> {m.common_delete()}
				</Button>
			{/if}
		{/if}

		{#if published && !draft.showOnGroupPage}
			<span class="ml-auto inline-flex items-center gap-1.5 text-xs text-text-subtle">
				<IconEyeOff size={14} /> {m.routes_route_editor_not_listed_group_page()}
			</span>
		{/if}
	</div>
</div>
