<script lang="ts">
	import { IconBrandDiscord, IconCheck, IconLink, IconChevronDown } from '@tabler/icons-svelte';
	import { m } from '$lib/paraglide/messages.js';
</script>
<figure class="overflow-hidden rounded-xl border border-border-base bg-surface">
	<figcaption class="flex items-center justify-between gap-3 border-b border-border-base px-5 py-4 text-xs text-text-muted"><span>{m.marketing_preview()}</span><IconBrandDiscord size={19}/></figcaption>
	<div class="p-6">
		<div class="mb-4 flex items-center gap-3"><img src="/logo.svg" width="32" height="32" alt="" class="rounded-lg"/><span class="text-sm font-semibold">TrPTools</span><span class="rounded bg-accent/15 px-1.5 py-0.5 font-mono text-[10px] text-accent">APP</span></div>
		<div class="rounded-r-lg border-l-[3px] border-accent bg-background-secondary p-4">
			<p class="text-base font-semibold">{m.marketing_preview_sheet()}</p><p class="mt-1 text-xs text-text-muted">{m.marketing_shifts()}</p>
			<div class="mt-5 flex flex-wrap items-center justify-between gap-3 text-sm"><span>{m.marketing_preview_slot()}</span><span class="font-mono text-xs text-text-muted">{m.marketing_preview_taken()}</span></div>
			<div class="mt-3 flex items-center gap-2 rounded border border-border-base px-3 py-2 text-xs"><IconCheck size={14} class="text-success"/><span>@Alex</span><IconChevronDown size={14} class="ml-auto text-text-muted"/></div>
		</div>
		<div class="mt-4 flex items-center gap-2 text-xs text-text-muted"><IconLink size={14}/>{m.marketing_preview_sync()}</div>
	</div>
	<svg viewBox="0 0 440 62" fill="none" class="w-full" aria-hidden="true">
		<path d="M45 31H395" stroke="var(--border-strong)" stroke-width="2"/>
		<path d="M45 31H220" stroke="var(--accent)" stroke-width="2"/>
		{#each [45,160,280,395] as x,i}<circle cx={x} cy="31" r="7" fill="var(--surface)" stroke={i < 2 ? 'var(--accent)' : 'var(--border-strong)'} stroke-width="3"/>{/each}
	</svg>
	<div class="grid grid-cols-3 gap-3 px-6 pb-6 text-center text-[11px] text-text-muted"><span>{m.marketing_preview_staff()}</span><span>{m.marketing_preview_start()}</span><span>{m.marketing_preview_end()}</span></div>
</figure>
