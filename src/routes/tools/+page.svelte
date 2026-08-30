<script lang="ts">
	import { IconArrowRight, IconBulb, IconRadio } from '@tabler/icons-svelte';
	import PageHeader from '$lib/components/ui/PageHeader.svelte';
	import { m } from '$lib/paraglide/messages.js';

	const tools = [
		{
			href: '/tools/stage',
			icon: IconBulb,
			title: m.common_stage_programmer(),
			body: 'Build lighting programs against a waveform, then export them into the game.',
			available: true
		},
		{
			// Dispatch on your own, with the game's built-in routes. Running a
			// shift with other people is a group's board, which this one says
			// so and links to.
			href: '/tools/dispatch',
			icon: IconRadio,
			title: m.common_dispatch(),
			body: "Assign the game's routes to a vehicle list on your own, with no group to set up.",
			available: true
		}
	];
</script>

<svelte:head>
	<title>{m.tools_tools_trp_tools()}</title>
	<meta name="description" content="Utilities for running a TrP transit group." />
</svelte:head>

<div class="mx-auto max-w-5xl px-4 py-10">
	<PageHeader title={m.tools_tools()} description={m.tools_utilities_running_group()} />

	<ul class="grid gap-4 sm:grid-cols-2">
		{#each tools as tool (tool.href)}
			<li>
				<a
					href={tool.href}
					class="card group flex h-full flex-col p-5 transition-colors hover:border-border-strong"
				>
					<tool.icon size={22} stroke={1.6} class="text-accent" />
					<h2 class="mt-3 flex items-center gap-1.5 font-semibold text-text">
						{tool.title}
						<IconArrowRight
							size={15}
							class="text-text-subtle transition-transform group-hover:translate-x-0.5"
						/>
					</h2>
					<p class="mt-1.5 text-sm leading-relaxed text-text-muted">{tool.body}</p>
				</a>
			</li>
		{/each}
	</ul>
</div>
