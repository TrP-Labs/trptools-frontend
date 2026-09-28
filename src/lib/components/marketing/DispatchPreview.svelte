<script lang="ts">
	import { IconCheck, IconUsers } from '@tabler/icons-svelte';
	import { m } from '$lib/paraglide/messages.js';
</script>
<figure class="overflow-hidden rounded-xl border border-border-base bg-surface">
	<figcaption class="flex flex-wrap items-center justify-between gap-2 border-b border-border-base px-5 py-4 text-xs text-text-muted">
		<span>{m.marketing_demo()}</span><span class="flex items-center gap-1.5"><IconUsers size={14}/>{m.marketing_dispatchers()}</span>
	</figcaption>
	<div class="grid grid-cols-[1fr_1fr_1.2fr] gap-2 px-5 py-3 text-[10px] uppercase tracking-widest text-text-muted"><span>{m.marketing_vehicle()}</span><span>{m.marketing_route()}</span><span>{m.marketing_status()}</span></div>
	{#each [{id:'1042',route:'14',color:'#e5ac54',done:true},{id:'1051',route:'N1',color:'#b69cdd',done:true},{id:'1068',route:'10',color:'#65abdb',done:false}] as row}
		<div class="grid grid-cols-[1fr_1fr_1.2fr] items-center gap-2 border-t border-border-base px-5 py-3 text-xs">
			<span class="font-mono text-sm">{row.id}</span><span class="w-fit rounded px-3 py-1 font-mono font-bold text-[#18222c]" style:background={row.color}>{row.route}</span>
			<span class="flex items-center gap-1 text-text-muted">{#if row.done}<IconCheck size={13} class="shrink-0 text-success"/>{m.marketing_confirmed()}{:else}{m.marketing_assigned()}{/if}</span>
		</div>
	{/each}
</figure>
