<script lang="ts">
	import { IconFlag } from '@tabler/icons-svelte';
	import { reportDialog } from '$lib/stores/report.svelte';
	import type { ReportTarget } from '$lib/api/types';

	interface Props {
		targetType: ReportTarget;
		targetId: string;
		label?: string;
		compact?: boolean;
	}

	let { targetType, targetId, label, compact = false }: Props = $props();
</script>

<!--
	Just a trigger. The dialog itself lives once in the root layout — see
	`$lib/stores/report.svelte`.
-->
<button
	type="button"
	onclick={() => reportDialog.open({ targetType, targetId, label: label ?? 'this content' })}
	title="Report {label ?? 'this content'}"
	aria-label="Report {label ?? 'this content'}"
	class="inline-flex shrink-0 items-center gap-1.5 rounded-md text-text-subtle transition-colors hover:text-danger
		{compact ? 'p-1' : 'px-2 py-1 text-xs'}"
>
	<IconFlag size={compact ? 14 : 13} />
	{#if !compact}Report{/if}
</button>
