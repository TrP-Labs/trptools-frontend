<script lang="ts">
	import type { Snippet } from 'svelte';

	type Tone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger';

	interface Props {
		tone?: Tone;
		class?: string;
		children: Snippet;
	}

	let { tone = 'neutral', class: className = '', children }: Props = $props();

	const tones: Record<Tone, string> = {
		neutral: 'bg-background-muted text-text-muted border-border-base',
		accent: 'bg-accent/15 text-accent border-accent/30',
		success: 'bg-success/15 text-success border-success/30',
		warning: 'bg-warning/15 text-warning border-warning/30',
		danger: 'bg-danger/15 text-danger border-danger/30'
	};
</script>

<span
	class="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap {tones[
		tone
	]} {className}"
>
	{@render children()}
</span>
