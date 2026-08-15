<script lang="ts">
	import { IconArrowRight, IconBulb, IconRadio, IconRoute } from '@tabler/icons-svelte';
	import PageHeader from '$lib/components/ui/PageHeader.svelte';

	const tools = [
		{
			href: '/tools/stage',
			icon: IconBulb,
			title: 'Stage programmer',
			body: 'Build lighting programs against a waveform, then export them into the game.',
			available: true
		},
		{
			href: '/dashboard',
			icon: IconRadio,
			title: 'Dispatch',
			body: 'Run a shift with your team. Open a room from your group dashboard.',
			available: true
		},
		{
			href: '/groups',
			icon: IconRoute,
			title: 'Route directory',
			body: 'Browse the routes published by groups across TrP.',
			available: true
		}
	];
</script>

<svelte:head>
	<title>Tools — TrP Tools</title>
	<meta name="description" content="Utilities for running a TrP transit group." />
</svelte:head>

<div class="mx-auto max-w-5xl px-4 py-10">
	<PageHeader title="Tools" description="Utilities for running a group." />

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
