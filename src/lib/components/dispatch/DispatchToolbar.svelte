<script lang="ts">
	/**
	 * Search, the two solve buttons, and what the board currently adds up to.
	 *
	 * The figures count only the vehicles that can carry a route: a shift whose
	 * service vans and scenery were in the denominator always looked half done.
	 */
	import { IconBolt, IconClipboardText, IconKeyboard, IconSearch } from '@tabler/icons-svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import { m } from '$lib/paraglide/messages.js';

	interface Props {
		search: string;
		searchInput: HTMLInputElement | null;
		solving: boolean;
		tracked: number;
		assigned: number;
		routable: number;
		/** How many vehicles the search matched, or null when not searching. */
		matching: number | null;
		navEnabled: boolean;
		onimport: () => void;
		onsolve: (includeAssigned: boolean) => void;
	}

	let {
		search = $bindable(),
		searchInput = $bindable(null),
		solving,
		tracked,
		assigned,
		routable,
		matching,
		navEnabled,
		onimport,
		onsolve
	}: Props = $props();
</script>

<div class="mb-4 flex flex-wrap items-center gap-2">
	<div class="relative min-w-48 flex-1">
		<IconSearch
			size={15}
			class="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-text-subtle"
		/>
		<input
			bind:this={searchInput}
			bind:value={search}
			type="search"
			placeholder={m.dispatch_dispatch_toolbar_search_vehicles()}
			aria-label={m.dispatch_dispatch_toolbar_search_vehicles_2()}
			class="w-full rounded-lg border border-border-base bg-background-secondary py-2 pr-3 pl-9 text-sm
				text-text placeholder:text-text-subtle focus:border-accent focus:outline-none"
		/>
	</div>

	<Button variant="secondary" onclick={onimport}>
		<IconClipboardText size={16} /> {m.common_import()}
	</Button>

	<Button onclick={() => onsolve(false)} loading={solving}>
		<IconBolt size={16} /> {m.dispatch_dispatch_toolbar_solve_routes()}
	</Button>

	<Button variant="ghost" onclick={() => onsolve(true)} disabled={solving}>{m.dispatch_dispatch_toolbar_reassign_all()}</Button>
</div>

<div class="mb-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-subtle">
	<p>
		{tracked} tracked · {assigned} of {routable} assigned
		{#if matching !== null}· {matching} matching{/if}
	</p>

	<p class="flex items-center gap-1.5">
		<IconKeyboard size={14} />
		{#if navEnabled}
			<span class="text-accent">
				{m.dispatch_dispatch_toolbar_keyboard_mode()} <kbd>↑</kbd><kbd>↓</kbd> {m.dispatch_dispatch_toolbar_vehicle()} <kbd>→</kbd> {m.dispatch_dispatch_toolbar_or()} <kbd>{m.dispatch_dispatch_toolbar_enter()}</kbd> {m.dispatch_dispatch_toolbar_go()} <kbd>←</kbd> {m.dispatch_dispatch_toolbar_or()} <kbd>{m.dispatch_dispatch_toolbar_esc()}</kbd> {m.dispatch_dispatch_toolbar_go_back()} <kbd>1</kbd>–<kbd>4</kbd> {m.dispatch_dispatch_toolbar_or()}
				<kbd>[</kbd><kbd>]</kbd> {m.dispatch_dispatch_toolbar_list()}
			</span>
		{:else}
			<span>
				{m.dispatch_dispatch_toolbar_press()} <kbd>\</kbd> {m.dispatch_dispatch_toolbar_keyboard_navigation()} <kbd>1</kbd>–<kbd>4</kbd> {m.dispatch_dispatch_toolbar_jump_list()}
			</span>
		{/if}
	</p>
</div>

<style>
	kbd {
		border: 1px solid var(--color-border-base);
		border-radius: 0.25rem;
		padding: 0 0.25rem;
		font-family: inherit;
		font-size: 0.9em;
	}
</style>
