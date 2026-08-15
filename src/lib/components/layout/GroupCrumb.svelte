<script lang="ts">
	import { IconChevronRight } from '@tabler/icons-svelte';
	import Avatar from '$lib/components/users/Avatar.svelte';
	import type { PublicGroupHeader } from '$lib/api/types';

	interface Props {
		group: PublicGroupHeader;
		/** The current page, shown after the group and not linked. */
		current: string;
	}

	let { group, current }: Props = $props();
</script>

<nav aria-label="Breadcrumb" class="flex items-center gap-2 text-sm">
	<a
		href="/g/{group.slug}"
		class="inline-flex min-w-0 items-center gap-2 text-text-muted transition-colors hover:text-text"
	>
		<Avatar src={group.icon} name={group.name} size={20} class="rounded-md" />
		<span class="truncate">{group.name}</span>
	</a>
	<IconChevronRight size={14} class="shrink-0 text-text-subtle" />
	<span class="truncate text-text-subtle">{current}</span>
</nav>
