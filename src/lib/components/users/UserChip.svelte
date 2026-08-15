<script lang="ts">
	import Avatar from './Avatar.svelte';

	interface Props {
		displayName?: string | null;
		username?: string | null;
		avatar?: string | null;
		subtitle?: string | null;
		size?: number;
		class?: string;
	}

	let { displayName, username, avatar, subtitle, size = 32, class: className = '' }: Props =
		$props();

	let primary = $derived(displayName || username || 'Unknown user');
	let secondary = $derived(subtitle ?? (username && username !== displayName ? `@${username}` : null));
</script>

<span class="flex min-w-0 items-center gap-2.5 {className}">
	<Avatar src={avatar} name={primary} {size} />
	<span class="flex min-w-0 flex-col leading-tight">
		<span class="truncate text-sm font-medium text-text">{primary}</span>
		{#if secondary}
			<span class="truncate text-xs text-text-muted">{secondary}</span>
		{/if}
	</span>
</span>
