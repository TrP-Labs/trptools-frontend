<script lang="ts">
	interface Props {
		class?: string;
		rounded?: string;
	}

	let { class: className = 'h-4 w-full', rounded = 'rounded-md' }: Props = $props();
</script>

<div class="animate-pulse bg-background-muted {rounded} {className}" aria-hidden="true"></div>
