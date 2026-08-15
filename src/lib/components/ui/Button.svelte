<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAnchorAttributes, HTMLButtonAttributes } from 'svelte/elements';

	type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
	type Size = 'sm' | 'md' | 'lg';

	interface Props {
		variant?: Variant;
		size?: Size;
		href?: string;
		loading?: boolean;
		full?: boolean;
		class?: string;
		children: Snippet;
	}

	let {
		variant = 'primary',
		size = 'md',
		href,
		loading = false,
		full = false,
		class: className = '',
		children,
		...rest
	}: Props & (HTMLButtonAttributes | HTMLAnchorAttributes) = $props();

	const variants: Record<Variant, string> = {
		primary:
			'bg-accent text-accent-contrast hover:bg-accent-hover active:brightness-95 border border-transparent',
		secondary:
			'bg-background-secondary text-text border border-border-base hover:bg-background-secondary-muted',
		ghost: 'bg-transparent text-text-muted hover:text-text hover:bg-background-secondary border border-transparent',
		danger: 'bg-danger text-white hover:brightness-110 active:brightness-95 border border-transparent'
	};

	const sizes: Record<Size, string> = {
		sm: 'text-sm px-3 py-1.5 gap-1.5 rounded-lg',
		md: 'text-sm px-4 py-2 gap-2 rounded-lg',
		lg: 'text-base px-5 py-2.5 gap-2 rounded-xl'
	};

	const base =
		'inline-flex items-center justify-center font-medium transition-colors select-none disabled:opacity-50 disabled:pointer-events-none';

	let classes = $derived(
		[base, variants[variant], sizes[size], full ? 'w-full' : '', className].filter(Boolean).join(' ')
	);
</script>

{#if href}
	<a {href} class={classes} {...rest as HTMLAnchorAttributes}>
		{#if loading}
			<span
				class="size-3.5 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent"
			></span>
		{/if}
		{@render children()}
	</a>
{:else}
	<button class={classes} disabled={loading || (rest as HTMLButtonAttributes).disabled} {...rest as HTMLButtonAttributes}>
		{#if loading}
			<span
				class="size-3.5 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent"
			></span>
		{/if}
		{@render children()}
	</button>
{/if}
