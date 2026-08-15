<script lang="ts">
	import {
		IconCalendarTime,
		IconRadio,
		IconRoute,
		IconUsers,
		IconArrowRight,
		IconBulb
	} from '@tabler/icons-svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import RouteBadge from '$lib/components/routes/RouteBadge.svelte';
	import { loginUrl } from '$lib/api/client';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const features = [
		{
			icon: IconRadio,
			title: 'Multi-user dispatch',
			body: 'Run a shift with your whole team in one room. Assignments, tows and vehicle deletions stay in sync for everyone, live.'
		},
		{
			icon: IconRoute,
			title: 'Custom routes, properly',
			body: 'Give every route its own colour, shape and depots. Automatic assignment treats a route you invented exactly like a built-in one.'
		},
		{
			icon: IconCalendarTime,
			title: 'Shift scheduling',
			body: 'Recurring shifts with slots people can sign up for, and a dashboard showing who is on which shift.'
		},
		{
			icon: IconUsers,
			title: 'Rank-based access',
			body: 'Map your Roblox roles to permissions once. Access follows your group, so promotions apply immediately.'
		},
		{
			icon: IconBulb,
			title: 'Stage programmer',
			body: 'Build lighting programs against a waveform and export them straight into the game.'
		}
	];
</script>

<svelte:head>
	<title>TrP Tools — Roblox group management for TrP</title>
</svelte:head>

<!-- Hero -->
<section class="border-b border-border-base">
	<div class="mx-auto max-w-7xl px-4 py-16 sm:py-24">
		<div class="max-w-2xl">
			<h1 class="text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
				Run your group without the spreadsheet.
			</h1>
			<p class="mt-4 text-lg text-pretty text-text-muted">
				Dispatch together in real time, schedule shifts people can actually sign up for, and give
				your custom routes the colours and automatic assignment they always should have had.
			</p>

			<div class="mt-8 flex flex-wrap gap-3">
				{#if data.user}
					<Button href="/dashboard" size="lg">
						Open dashboard <IconArrowRight size={17} />
					</Button>
					<Button href="/groups" size="lg" variant="secondary">Browse groups</Button>
				{:else}
					<Button href={loginUrl()} size="lg">Sign in with Roblox</Button>
					<Button href="/groups" size="lg" variant="secondary">Browse groups</Button>
				{/if}
			</div>
		</div>
	</div>
</section>

<!-- Features -->
<section class="mx-auto max-w-7xl px-4 py-16">
	<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
		{#each features as feature (feature.title)}
			<article class="card p-5">
				<feature.icon size={22} stroke={1.6} class="text-accent" />
				<h2 class="mt-3 font-semibold text-text">{feature.title}</h2>
				<p class="mt-1.5 text-sm leading-relaxed text-text-muted">{feature.body}</p>
			</article>
		{/each}
	</div>
</section>
