<script lang="ts">
	interface Props {
		size?: number;
		class?: string;
		label?: string;
	}

	let { size = 20, class: className = '', label = 'Loading' }: Props = $props();
</script>

<span
	role="status"
	aria-label={label}
	class="inline-block animate-spin rounded-full border-2 border-current border-t-transparent opacity-60 {className}"
	style="width: {size}px; height: {size}px;"
></span>
