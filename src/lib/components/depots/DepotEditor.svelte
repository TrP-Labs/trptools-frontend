<script lang="ts" module>
	import type { Translations } from '$lib/utils/translations';

	export interface DepotDraft {
		number: number;
		name: string;
		description: string;
		color: string;
		/** Free text in the form; split into the array the API wants on save. */
		aliases: string;
		visibility: 'PUBLIC' | 'UNLISTED' | 'PRIVATE';
		/** Whether the group's public page lists this depot. */
		showOnGroupPage: boolean;
		archived: boolean;
		/** Every other language's version of the name and description. */
		translations: Translations;
	}

	/**
	 * The parts of a depot, in the order they are read.
	 *
	 * Named rather than always drawn together, because the same form is both
	 * the create dialog — one sheet — and the depot's own page, where each
	 * part is a section with its own address (§10.1).
	 */
	export type DepotSection = 'depot' | 'public' | 'availability';

	/** `aliases` is a comma-separated field in the form, a list over the wire. */
	export function depotPayload(draft: DepotDraft) {
		const { aliases, ...values } = draft;

		return {
			...values,
			number: Number(values.number) || 0,
			aliases: aliases
				.split(',')
				.map((alias) => alias.trim())
				.filter(Boolean)
				.slice(0, 12)
		};
	}
</script>

<script lang="ts">
	import { IconEyeOff, IconTrash } from '@tabler/icons-svelte';
	import Field from '$lib/components/ui/Field.svelte';
	import FieldGroup from '$lib/components/ui/FieldGroup.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import Select from '$lib/components/ui/Select.svelte';
	import Toggle from '$lib/components/ui/Toggle.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import ColorInput from '$lib/components/ui/ColorInput.svelte';
	import DepotBadge from '$lib/components/depots/DepotBadge.svelte';
	import ImageManager from '$lib/components/media/ImageManager.svelte';
	import IconUploader from '$lib/components/media/IconUploader.svelte';
	import TranslatableField from '$lib/components/i18n/TranslatableField.svelte';
	import type { MediaItem } from '$lib/api/types';
	import { m } from '$lib/paraglide/messages.js';

	interface Props {
		draft: DepotDraft;
		/** Which parts to draw. All of them, unless a page asks for one. */
		show?: DepotSection[];
		mode: 'create' | 'edit';
		busy?: boolean;
		/** The language the group writes in, which the boxes default to. */
		sourceLocale: string;
		/** Existing depot id, so images can be attached. */
		depotId?: string;
		groupId?: string;
		images?: MediaItem[];
		/** The uploaded tile in place right now, if any. */
		icon?: string | null;
		onsave: () => void;
		ondelete?: () => void;
		onimageschanged?: () => void;
	}

	let {
		draft = $bindable(),
		show = ['depot', 'public', 'availability'],
		mode,
		busy = false,
		sourceLocale,
		depotId,
		groupId,
		images = [],
		icon = null,
		onsave,
		ondelete,
		onimageschanged
	}: Props = $props();

	const visibilities = [
		{ value: 'PUBLIC' as const, label: m.common_public() },
		{ value: 'PRIVATE' as const, label: m.common_members_only() }
	];

	/** Nothing under "public page" can take effect once the depot is private. */
	let published = $derived(draft.visibility === 'PUBLIC');
</script>

<div class="space-y-6">
	{#if show.includes('depot')}
		<FieldGroup
			title={m.dashboard_depots_depot()}
			description={m.dashboard_depots_how_game_identifies_spawn()}
			columns={1}
		>
			<div class="grid gap-5 sm:grid-cols-[auto_1fr]">
				<div class="flex flex-col items-center gap-2 sm:w-32">
					<DepotBadge
						number={Number(draft.number) || 0}
						color={draft.color}
						{icon}
						name={draft.name}
						size="lg"
					/>
					<p class="text-center text-xs text-text-subtle">
						{icon ? m.depots_depot_editor_uploaded_tile() : m.routes_route_editor_live_preview()}
					</p>
				</div>

				<div class="grid gap-4 sm:grid-cols-2">
					<Field
						label={m.dashboard_depots_depot_number()}
						hint={m.dashboard_depots_number_game_uses_spawn_location()}
					>
						<Input type="number" min="0" max="9999" bind:value={draft.number} />
					</Field>

					<Field label={m.common_color()}>
						<ColorInput bind:value={draft.color} />
					</Field>

					<Field label={m.common_name()} class="sm:col-span-2">
						<TranslatableField
							bind:value={draft.name}
							bind:translations={draft.translations}
							field="name"
							{sourceLocale}
							maxlength={60}
							placeholder={m.dashboard_depots_e_g_cat_island()}
						/>
					</Field>

					<Field label={m.common_description()} class="sm:col-span-2">
						<TranslatableField
							bind:value={draft.description}
							bind:translations={draft.translations}
							field="description"
							{sourceLocale}
							multiline
							rows={3}
							maxlength={2000}
							placeholder={m.dashboard_depots_where_what_runs_from_anything_worth()}
						/>
					</Field>

					<!--
						Aliases are matched against what the *game* reports, so
						they are not translatable for the same reason a
						built-in route's name is not.
					-->
					<Field
						label={m.dashboard_depots_other_names_game()}
						hint={m.dashboard_depots_comma_separated_dispatch_matches_spawn_name()}
						class="sm:col-span-2"
					>
						<Input bind:value={draft.aliases} placeholder={m.dashboard_depots_e_g_hardbass_island()} />
					</Field>
				</div>
			</div>

			{#if mode === 'edit' && depotId && groupId}
				<IconUploader
					{groupId}
					ownerType="DEPOT"
					ownerId={depotId}
					current={icon}
					label={m.dashboard_depots_depot_icon()}
					hint={m.dashboard_depots_replaces_numbered_tile_wherever_depot_appears()}
				/>
			{/if}
		</FieldGroup>
	{/if}

	{#if show.includes('public')}
		<FieldGroup
			title={m.common_public_page()}
			description={m.dashboard_depots_what_visitors_group_see()}
			columns={1}
		>
			<Field
				label={m.common_visibility()}
				hint={m.dashboard_depots_members_only_keeps_depot_inside_dashboard()}
			>
				<Select bind:value={draft.visibility} options={visibilities} class="sm:max-w-64" />
			</Field>

			<Toggle
				bind:checked={draft.showOnGroupPage}
				disabled={!published}
				label={m.dashboard_depots_list_group_page()}
				description={published
					? m.dashboard_depots_off_keeps_depot_at_its_own()
					: m.dashboard_depots_members_only_depots_never_appear_group()}
			/>

			{#if mode === 'edit' && depotId && groupId}
				<ImageManager
					{groupId}
					ownerType="DEPOT"
					ownerId={depotId}
					{images}
					label={m.dashboard_depots_depot_images()}
					hint={m.dashboard_depots_shown_public_page_up_12_images()}
					onchange={onimageschanged}
				/>
			{/if}
		</FieldGroup>
	{/if}

	{#if mode === 'edit' && show.includes('availability')}
		<FieldGroup title={m.dashboard_depots_availability()} columns={1}>
			<Toggle
				bind:checked={draft.archived}
				label={m.common_disabled()}
				description={m.dashboard_depots_hidden_from_dispatch_public_page_routes()}
			/>
		</FieldGroup>
	{/if}

	<div class="flex flex-wrap items-center gap-2 border-t border-border-base pt-4">
		<Button onclick={onsave} loading={busy} disabled={!draft.name.trim()}>
			{mode === 'create' ? m.dashboard_depots_create_depot() : m.common_save_changes()}
		</Button>

		{#if mode === 'edit' && show.includes('availability') && ondelete}
			<Button variant="danger" onclick={ondelete} disabled={busy}>
				<IconTrash size={16} /> {m.common_delete()}
			</Button>
		{/if}

		{#if published && !draft.showOnGroupPage && show.includes('public')}
			<span class="ml-auto inline-flex items-center gap-1.5 text-xs text-text-subtle">
				<IconEyeOff size={14} /> {m.routes_route_editor_not_listed_group_page()}
			</span>
		{/if}
	</div>
</div>
