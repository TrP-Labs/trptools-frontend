<script lang="ts" module>
	import type { Icon } from '@tabler/icons-svelte';

	export interface ObjectSection {
		id: string;
		label: string;
		icon: Icon;
		/** A count worth seeing before the section is opened, such as a queue. */
		badge?: number;
	}
</script>

<script lang="ts">
	import type { Snippet } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { IconChevronLeft } from '@tabler/icons-svelte';
	import { m } from '$lib/paraglide/messages.js';

	/**
	 * One thing in the dashboard, given a page of its own.
	 *
	 * The editors here grew by accretion — every setting a rank or a form
	 * gained was another row inside a card inside a list, until opening one
	 * meant reading everything about all of them. An object gets an address
	 * instead, and its settings are grouped into sections you can move between,
	 * so a group can send somebody to the part that matters.
	 *
	 * The open section lives in the URL rather than in component state, which
	 * is what makes those links work and makes the browser's own back button
	 * behave the way it looks like it should.
	 */
	interface Props {
		/** Where the parent list lives. */
		backHref: string;
		backLabel: string;
		title: string;
		description?: string;
		/** A colour to lead the header with, when the object carries one. */
		accent?: string;
		sections: ObjectSection[];
		meta?: Snippet;
		actions?: Snippet;
		/** Rendered with whichever section is open. */
		children: Snippet<[string]>;
	}

	let { backHref, backLabel, title, description, accent, sections, meta, actions, children }: Props =
		$props();

	let fallback = $derived(sections[0]?.id ?? '');

	let active = $derived.by(() => {
		const wanted = page.url.searchParams.get('section');
		return sections.some((section) => section.id === wanted) ? wanted! : fallback;
	});

	function select(id: string) {
		const url = new URL(page.url);

		// The first section is the bare address, so a plain link to the object
		// and a link to its opening section are the same URL.
		if (id === fallback) url.searchParams.delete('section');
		else url.searchParams.set('section', id);

		goto(url, { replaceState: true, noScroll: true, keepFocus: true });
	}
</script>

<div class="space-y-6">
	<div>
		<a
			href={backHref}
			class="inline-flex items-center gap-1 text-sm text-text-muted transition-colors hover:text-text"
		>
			<IconChevronLeft size={15} />
			{backLabel}
		</a>

		<!--
			Stacked on a phone rather than wrapped: `justify-between` with a
			shrinkable title let the actions sit *beside* a two-word-wide title
			instead of below it, which read as a heading with a button through
			the middle of it.
		-->
		<header class="mt-3 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
			<div class="flex min-w-0 items-start gap-3 sm:flex-1">
				{#if accent}
					<span class="mt-1 h-9 w-1.5 shrink-0 rounded-full" style="background: {accent}"></span>
				{/if}

				<div class="min-w-0">
					<div class="flex flex-wrap items-center gap-x-3 gap-y-2">
						<h1 class="text-2xl font-semibold tracking-tight text-text">{title}</h1>
						{#if meta}
							<div class="flex flex-wrap items-center gap-2">{@render meta()}</div>
						{/if}
					</div>
					{#if description}
						<p class="mt-1 max-w-2xl text-sm text-text-muted">{description}</p>
					{/if}
				</div>
			</div>

			{#if actions}
				<div class="flex flex-wrap items-center gap-2">{@render actions()}</div>
			{/if}
		</header>
	</div>

	<!-- Scrolls sideways on a phone rather than wrapping into a block of tabs. -->
	<nav aria-label={m.layout_object_page_sections()} class="-mx-4 border-b border-border-base px-4">
		<ul class="flex gap-1 overflow-x-auto pb-px">
			{#each sections as section (section.id)}
				{@const current = section.id === active}
				<li class="shrink-0">
					<button
						type="button"
						aria-current={current ? 'page' : undefined}
						onclick={() => select(section.id)}
						class="flex items-center gap-2 border-b-2 px-3 py-2.5 text-sm whitespace-nowrap transition-colors
							{current
							? 'border-accent font-medium text-text'
							: 'border-transparent text-text-muted hover:text-text'}"
					>
						<section.icon size={17} stroke={1.6} />
						{section.label}
						{#if section.badge}
							<span
								class="rounded-full px-1.5 py-0.5 text-xs font-semibold tabular-nums
									{current ? 'bg-accent/15 text-accent' : 'bg-background-muted text-text-muted'}"
							>
								{section.badge}
							</span>
						{/if}
					</button>
				</li>
			{/each}
		</ul>
	</nav>

	{@render children(active)}
</div>
