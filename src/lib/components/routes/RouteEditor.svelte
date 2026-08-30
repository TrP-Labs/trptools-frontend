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
		{ value: 'AUTO' as const, label: 'Automatic' },
		{ value: 'CIRCLE' as const, label: 'Circle' },
		{ value: 'RECTANGLE' as const, label: 'Rectangle' },
		{ value: 'DIAMOND' as const, label: 'Diamond' },
		{ value: 'HEXAGON' as const, label: 'Hexagon' }
	];

	const visibilities = [
		{ value: 'PUBLIC' as const, label: 'Public' },
		{ value: 'PRIVATE' as const, label: 'Members only' }
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
	<FieldGroup title="Route" description="Its name, and how the badge is drawn." columns={1}>
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
					{icon ? 'Uploaded badge' : 'Live preview'}
				</p>
			</div>

			<div class="grid gap-4 sm:grid-cols-2">
				<Field
					label="Route name"
					hint={builtIn
						? 'Built-in routes keep the name the game uses.'
						: 'Must match the route name in game. Up to 10 characters shown.'}
				>
					<Input
						bind:value={draft.name}
						maxlength={24}
						disabled={builtIn}
						placeholder="e.g. 14 or EXPRESS"
					/>
				</Field>

				<Field label="Shape" hint="Automatic makes short names round and long names rectangular.">
					<Select bind:value={draft.shape} options={shapes} />
				</Field>

				<Field label="Route colour">
					<ColorInput bind:value={draft.color} />
				</Field>

				<Field label="Label colour" hint="The ink used for the route number itself.">
					<ColorInput bind:value={draft.textColor} />
				</Field>

				<Field label="Description" class="sm:col-span-2">
					<Textarea
						bind:value={draft.description}
						rows={2}
						maxlength={1000}
						placeholder="Where this route runs, and anything drivers should know."
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
				label="Route badge"
				hint="Replaces the drawn roundel everywhere this route appears, including the dispatch table. Square images work best. Saved as soon as it uploads."
			/>
		{/if}
	</FieldGroup>

	<FieldGroup title="Dispatch" description="How automatic assignment treats it." columns={1}>
		<Field
			label="Depots served"
			hint="Automatic assignment only puts vehicles on routes their depot serves. Select none to serve every depot."
		>
			{#if depots.length === 0}
				<p class="text-sm text-text-muted">No depots configured yet.</p>
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
			label="Target share"
			hint="The portion of dispatchable vehicles this route should carry. Shares are weighed against the other routes each depot serves, so they need not total 100."
		>
			<div class="flex items-center gap-3">
				<input
					type="range"
					min="0"
					max="100"
					step="1"
					bind:value={draft.targetShare}
					aria-label="Target share"
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
						aria-label="Target share, percent"
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
			label="Include in automatic assignment"
			description="Turn off for routes that should only ever be assigned by hand."
		/>
	</FieldGroup>

	<FieldGroup title="Public page" description="What visitors to the group see." columns={1}>
		<Field label="Visibility" hint="Members only keeps this route inside the dashboard.">
			<Select bind:value={draft.visibility} options={visibilities} class="sm:max-w-64" />
		</Field>

		<Toggle
			bind:checked={draft.showOnGroupPage}
			disabled={!published}
			label="List on the group page"
			description={published
				? 'Off keeps the route at its own address without crowding the group page.'
				: 'Members-only routes never appear on the group page.'}
		/>

		{#if mode === 'edit' && routeId && groupId}
			<ImageManager
				{groupId}
				ownerType="ROUTE"
				ownerId={routeId}
				{images}
				label="Route maps"
				hint="Shown on the public page. Up to 12 images."
				onchange={onimageschanged}
			/>
		{/if}
	</FieldGroup>

	{#if mode === 'edit'}
		<FieldGroup title="Availability" columns={1}>
			<Toggle
				bind:checked={draft.archived}
				label="Disabled"
				description={builtIn
					? 'Hides this built-in route from dispatch and the public page. You can turn it back on at any time.'
					: 'Hidden from dispatch and public pages, without deleting its history.'}
			/>
		</FieldGroup>
	{/if}

	<div class="flex flex-wrap items-center gap-2 border-t border-border-base pt-4">
		<Button onclick={onsave} loading={busy} disabled={!draft.name.trim()}>
			{mode === 'create' ? 'Create route' : 'Save changes'}
		</Button>

		{#if mode === 'edit'}
			{#if builtIn}
				<span class="inline-flex items-center gap-1.5 text-xs text-text-subtle">
					<IconLock size={14} /> Built-in routes can be disabled but not deleted
				</span>
			{:else if ondelete}
				<Button variant="danger" onclick={ondelete} disabled={busy}>
					<IconTrash size={16} /> Delete
				</Button>
			{/if}
		{/if}

		{#if published && !draft.showOnGroupPage}
			<span class="ml-auto inline-flex items-center gap-1.5 text-xs text-text-subtle">
				<IconEyeOff size={14} /> Not listed on the group page
			</span>
		{/if}
	</div>
</div>
