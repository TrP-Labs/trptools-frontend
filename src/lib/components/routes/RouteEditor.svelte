<script lang="ts">
	import { IconLock, IconTrash } from '@tabler/icons-svelte';
	import RouteBadge from './RouteBadge.svelte';
	import Field from '$lib/components/ui/Field.svelte';
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
</script>

<div class="grid gap-5 md:grid-cols-[auto_1fr]">
	<div class="flex flex-col items-center gap-2 md:w-32">
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
			<Input bind:value={draft.name} maxlength={24} disabled={builtIn} placeholder="e.g. 14 or EXPRESS" />
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

		<Field
			label="Depots served"
			hint="Automatic assignment only puts vehicles on routes their depot serves. Select none to serve every depot."
			class="sm:col-span-2"
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
							class="rounded-lg border px-3 py-1.5 text-sm transition-colors
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
			class="sm:col-span-2"
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

		<Field label="Visibility" hint="Public routes appear on the group's public page.">
			<Select bind:value={draft.visibility} options={visibilities} />
		</Field>

		<div class="space-y-3 sm:col-span-2">
			<Toggle
				bind:checked={draft.autoAssign}
				label="Include in automatic assignment"
				description="Turn off for routes that should only ever be assigned by hand."
			/>

			{#if mode === 'edit'}
				<Toggle
					bind:checked={draft.archived}
					label="Disabled"
					description={builtIn
						? 'Hides this built-in route from dispatch and the public page. You can turn it back on at any time.'
						: 'Hidden from dispatch and public pages, without deleting its history.'}
				/>
			{/if}
		</div>

		{#if mode === 'edit' && routeId && groupId}
			<div class="sm:col-span-2">
				<IconUploader
					{groupId}
					ownerType="ROUTE"
					ownerId={routeId}
					current={icon}
					label="Route badge"
					hint="Replaces the drawn roundel everywhere this route appears, including the dispatch table. Square images work best. Saved as soon as it uploads."
				/>
			</div>

			<div class="sm:col-span-2">
				<ImageManager
					{groupId}
					ownerType="ROUTE"
					ownerId={routeId}
					{images}
					label="Route maps"
					hint="Shown on the public page. Up to 12 images."
					onchange={onimageschanged}
				/>
			</div>
		{/if}

		<div class="flex flex-wrap items-center gap-2 sm:col-span-2">
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
		</div>
	</div>
</div>
