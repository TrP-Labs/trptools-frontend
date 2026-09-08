<script lang="ts">
	import { page } from '$app/state';
	import { ALL_PERMISSIONS, canAny } from '$lib/utils/permissions';
	// Tabler still ships class-based Svelte 4 components, so its own `Icon`
	// type is what fits here rather than the runes-era `Component`.
	import type { Icon } from '@tabler/icons-svelte';

	export interface SidebarItem {
		href: string;
		label: string;
		icon: Icon;
		/**
		 * The grants that open this entry. Any one of them is enough — an
		 * application form is reached by whoever builds it *and* by whoever
		 * reviews its queue. Absent means everybody who can see the group.
		 */
		permissions?: number[];
		exact?: boolean;
	}

	interface Props {
		title: string;
		items: SidebarItem[];
		/** What the viewer holds in this group. See `$lib/utils/permissions`. */
		permissions?: number;
	}

	let { title, items, permissions = ALL_PERMISSIONS }: Props = $props();

	let visible = $derived(
		items.filter((item) => !item.permissions || canAny(permissions, item.permissions))
	);

	function isActive(item: SidebarItem) {
		return item.exact
			? page.url.pathname === item.href
			: page.url.pathname === item.href || page.url.pathname.startsWith(`${item.href}/`);
	}
</script>

<!-- Rail on desktop, horizontal scroller on mobile. -->
<nav
	aria-label={title}
	class="shrink-0 border-b border-border-base md:w-60 md:border-r md:border-b-0 md:py-6"
>
	<p
		class="hidden px-3 pb-2 text-xs font-semibold tracking-wide text-text-subtle uppercase md:block"
	>
		{title}
	</p>

	<ul class="flex gap-1 overflow-x-auto px-2 py-2 md:flex-col md:overflow-visible md:px-2 md:py-0">
		{#each visible as item (item.href)}
			{@const active = isActive(item)}
			<li class="shrink-0 md:shrink">
				<a
					href={item.href}
					aria-current={active ? 'page' : undefined}
					class="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm whitespace-nowrap transition-colors
						{active
						? 'bg-background-secondary font-medium text-text'
						: 'text-text-muted hover:bg-background-secondary/60 hover:text-text'}"
				>
					<item.icon size={18} stroke={1.6} />
					{item.label}
				</a>
			</li>
		{/each}
	</ul>
</nav>
