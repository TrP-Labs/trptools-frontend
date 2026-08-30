<script lang="ts">
	/**
	 * One control for "I want this route" and "I would rather not".
	 *
	 * Both live behind a single button because they are one decision, and a
	 * route card has no room for two. Unmarked, it shows a thumb up and a thumb
	 * down together and opens a menu; marked, it *is* the answer — green thumb
	 * up or red thumb down — and pressing it takes the mark off again, so the
	 * menu is only ever in the way when there is a choice left to make.
	 *
	 * The solver reads the same marks when it assigns routes, which is why this
	 * sits on the public pages rather than in settings: the moment somebody
	 * decides they like a route is the moment they are looking at it.
	 */
	import { IconThumbDown, IconThumbUp } from '@tabler/icons-svelte';
	import { routePreferences, type RoutePreference } from '$lib/stores/routePreferences.svelte';
	import { m } from '$lib/paraglide/messages.js';

	interface Props {
		routeId: string;
		/** The route's name — the button's description, and the key a built-in is marked by. */
		routeName: string;
		/**
		 * One of the routes the game ships with. Marking it marks the route
		 * everywhere, since every group runs the same one.
		 */
		builtIn?: boolean;
		/** Draws the state's name beside the icon, as the report button does. */
		showLabel?: boolean;
		class?: string;
	}

	let {
		routeId,
		routeName,
		builtIn = false,
		showLabel = false,
		class: className = ''
	}: Props = $props();

	// The list is fetched once for the tab, by whichever button mounts first.
	routePreferences.load();

	let route = $derived({ id: routeId, name: routeName, builtIn });
	let preference = $derived(routePreferences.get(route));
	let subject = $derived(`route ${routeName}`);
	/** Said once, where somebody is about to make the choice. */
	let scope = $derived(builtIn ? ' in every group' : '');

	let open = $state(false);
	let root = $state<HTMLDivElement | null>(null);

	function close() {
		open = false;
	}

	async function choose(next: RoutePreference | null) {
		close();
		await routePreferences.set(route, next);
	}

	/**
	 * A card is a link with an overlay covering it, so every press here has to
	 * be stopped from following it.
	 */
	function press(event: MouseEvent) {
		event.preventDefault();
		event.stopPropagation();

		// A route already marked needs no menu: the button says what it is, and
		// pressing it clears it.
		if (preference) {
			choose(null);
			return;
		}

		open = !open;
	}

	function onWindowPointerDown(event: PointerEvent) {
		if (!open) return;
		if (root && !root.contains(event.target as Node)) close();
	}

	function onWindowKeydown(event: KeyboardEvent) {
		if (open && event.key === 'Escape') {
			event.stopPropagation();
			close();
		}
	}

	let tone = $derived(
		preference === 'FAVORITE'
			? 'border-success/50 bg-success/15 text-success hover:bg-success/25'
			: preference === 'DISLIKE'
				? 'border-danger/50 bg-danger/15 text-danger hover:bg-danger/25'
				: 'border-transparent text-text-subtle hover:bg-background-muted hover:text-text'
	);

	let title = $derived(
		preference === 'FAVORITE'
			? `You favourited ${subject}${scope} — press to clear it`
			: preference === 'DISLIKE'
				? `You disliked ${subject}${scope} — press to clear it`
				: `Favourite or dislike ${subject}${scope}`
	);
</script>

<svelte:window onpointerdown={onWindowPointerDown} onkeydown={onWindowKeydown} />

<div bind:this={root} class="relative shrink-0 {className}">
	<button
		type="button"
		aria-haspopup={preference ? undefined : 'menu'}
		aria-expanded={preference ? undefined : open}
		aria-pressed={preference ? true : undefined}
		aria-label={title}
		{title}
		onclick={press}
		class="flex items-center gap-1.5 rounded-md border transition-colors
			{showLabel ? 'px-2 py-1 text-xs font-medium' : 'size-7 justify-center'}
			{tone}"
	>
		{#if preference === 'FAVORITE'}
			<IconThumbUp size={15} />
			{#if showLabel}Favourite{/if}
		{:else if preference === 'DISLIKE'}
			<IconThumbDown size={15} />
			{#if showLabel}Disliked{/if}
		{:else}
			<!--
				The two thumbs read as one mark rather than as two buttons: they
				overlap on a diagonal and neither can be pressed on its own.
			-->
			<span class="relative block size-4" aria-hidden="true">
				<IconThumbUp size={11} class="absolute top-0 left-0" />
				<IconThumbDown size={11} class="absolute right-0 bottom-0" />
			</span>
			{#if showLabel}Rate route{/if}
		{/if}
	</button>

	{#if open && !preference}
		<div
			role="menu"
			tabindex="-1"
			class="absolute right-0 z-30 mt-1 min-w-40 overflow-hidden rounded-lg border border-border-base
				bg-background-secondary py-1 shadow-lg"
		>
			<button
				type="button"
				role="menuitem"
				onclick={(event) => {
					event.preventDefault();
					event.stopPropagation();
					choose('FAVORITE');
				}}
				class="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-text
					transition-colors hover:bg-background-muted"
			>
				<IconThumbUp size={15} class="text-success" /> {m.routes_route_preference_button_favourite()}
			</button>

			<button
				type="button"
				role="menuitem"
				onclick={(event) => {
					event.preventDefault();
					event.stopPropagation();
					choose('DISLIKE');
				}}
				class="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-text
					transition-colors hover:bg-background-muted"
			>
				<IconThumbDown size={15} class="text-danger" /> {m.routes_route_preference_button_dislike()}
			</button>

			{#if builtIn}
				<!--
					Said here rather than left to be discovered: the same choice
					on a custom route only affects that group, and nothing else
					on the card distinguishes the two.
				-->
				<p class="border-t border-border-base px-3 pt-2 pb-1 text-xs text-text-subtle">
					Applies to route {routeName} in every group.
				</p>
			{/if}
		</div>
	{/if}
</div>
