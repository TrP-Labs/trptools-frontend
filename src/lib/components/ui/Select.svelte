<script lang="ts" generics="T extends string | number">
	interface Option {
		value: T;
		label: string;
		disabled?: boolean;
	}

	interface Props {
		value: T;
		options: Option[];
		id?: string;
		disabled?: boolean;
		class?: string;
		onchange?: (value: T) => void;
	}

	let {
		value = $bindable(),
		options,
		id,
		disabled = false,
		class: className = '',
		onchange
	}: Props = $props();

	function handle(event: Event) {
		const raw = (event.currentTarget as HTMLSelectElement).value;
		const match = options.find((option) => String(option.value) === raw);
		if (match) {
			value = match.value;
			onchange?.(match.value);
		}
	}
</script>

<select
	{id}
	{disabled}
	value={String(value)}
	onchange={handle}
	class="w-full appearance-none rounded-lg border border-border-base bg-background-secondary px-3 py-2 pr-9 text-sm text-text
		focus:border-accent focus:outline-none disabled:cursor-not-allowed disabled:opacity-60 {className}"
	style="background-image: url(&quot;data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23999' stroke-width='2' stroke-linecap='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E&quot;); background-repeat: no-repeat; background-position: right 0.65rem center;"
>
	{#each options as option (option.value)}
		<option value={String(option.value)} disabled={option.disabled}>{option.label}</option>
	{/each}
</select>
