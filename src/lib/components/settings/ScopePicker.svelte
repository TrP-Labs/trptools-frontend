<script lang="ts">
	/**
	 * The API key scopes, one fold per area.
	 *
	 * Thirty-odd chips in one wrapping row could not be read, so each area
	 * folds away and says how many of its scopes are ticked. An area holding
	 * a ticked scope starts open, which is the default set on a new key.
	 */
	import { IconChevronDown } from '@tabler/icons-svelte';
	import { SCOPE_CATEGORIES, categoryLabel, scopeDescription } from '$lib/utils/apiScopes';
	import { m } from '$lib/paraglide/messages.js';

	let { scopes = $bindable<string[]>([]) }: { scopes: string[] } = $props();

	function toggle(scope: string) {
		scopes = scopes.includes(scope) ? scopes.filter((value) => value !== scope) : [...scopes, scope];
	}

	const initiallyOpen = new Set(
		SCOPE_CATEGORIES.filter((category) => category.scopes.some((scope) => scopes.includes(scope))).map(
			(category) => category.id
		)
	);
</script>

<div class="space-y-2">
	{#each SCOPE_CATEGORIES as category (category.id)}
		{@const ticked = category.scopes.filter((scope) => scopes.includes(scope)).length}
		<details class="group min-w-0 rounded-lg border border-border-base" open={initiallyOpen.has(category.id)}>
			<summary class="flex cursor-pointer list-none items-center gap-3 px-3 py-2.5">
				<span class="min-w-0 flex-1 text-sm font-medium wrap-anywhere text-text">{categoryLabel(category.id)}</span>
				{#if ticked > 0}
					<span class="shrink-0 rounded-full bg-accent/15 px-2 py-0.5 text-xs text-accent"
						>{m.settings_api_keys_selected_count({ count: ticked })}</span
					>
				{/if}
				<IconChevronDown size={16} class="shrink-0 text-text-subtle transition-transform group-open:rotate-180" />
			</summary>
			<ul class="space-y-1 border-t border-border-base p-2">
				{#each category.scopes as scope (scope)}
					<li class="min-w-0">
						<label
							class="flex cursor-pointer items-start gap-3 rounded-md px-2 py-1.5 hover:bg-background-secondary"
						>
							<input
								type="checkbox"
								class="mt-0.5 shrink-0"
								checked={scopes.includes(scope)}
								onchange={() => toggle(scope)}
							/>
							<span class="min-w-0">
								<span class="block font-mono text-xs text-text">{scope}</span>
								<span class="block text-xs text-text-muted">{scopeDescription(scope)}</span>
							</span>
						</label>
					</li>
				{/each}
			</ul>
		</details>
	{/each}
</div>
