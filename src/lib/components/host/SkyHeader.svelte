<script lang="ts">
	/**
	 * The shift clock, painted with the game's own sky.
	 *
	 * While a hosted server is reporting, the header takes the colour of the
	 * sky at the in-game time — night, a golden dawn, blue day, dusk — with the
	 * sun or moon on its arc, so a host can tell at a glance what drivers are
	 * looking at. Without a server it falls back to a plain night-blue, since
	 * there is no game time to show.
	 *
	 * Always dark underneath, so the white type reads the same in every theme.
	 */
	import type { Snippet } from 'svelte';
	import { IconMoon, IconSun } from '@tabler/icons-svelte';
	import { bodyProgress, formatGameTime, skyColors, skyPhase } from '$lib/utils/sky';
	import { m } from '$lib/paraglide/messages.js';

	interface Props {
		/** In-game minutes after midnight, or null with no server reporting. */
		gameMinute: number | null;
		label: string;
		countdown: string;
		subtitle?: string;
		title: string;
		when: string;
		status?: Snippet;
		children?: Snippet;
	}

	let { gameMinute, label, countdown, subtitle, title, when, status, children }: Props = $props();

	let colors = $derived(gameMinute === null ? ['#111a33', '#22305a'] : skyColors(gameMinute));
	let phase = $derived(gameMinute === null ? null : skyPhase(gameMinute));
	let body = $derived(gameMinute === null ? null : bodyProgress(gameMinute));
	// An arc across the header: x across the width, y up and back down.
	let bodyX = $derived(body ? 8 + body.progress * 84 : 0);
	let bodyY = $derived(body ? 70 - Math.sin(body.progress * Math.PI) * 52 : 0);
</script>

<section
	class="sky relative isolate overflow-hidden rounded-2xl border border-white/10 text-white shadow-lg"
	style="--sky-top: {colors[0]}; --sky-bottom: {colors[1]}"
	data-phase={phase ?? 'none'}
	data-testid="sky-header"
>
	{#if phase === 'night' || phase === null}<div class="stars" aria-hidden="true"></div>{/if}
	{#if body}
		<div
			class="body {body.sun ? 'sun' : 'moon'}"
			style="left: {bodyX}%; top: {bodyY}%"
			aria-hidden="true"
		></div>
	{/if}
	<div class="shade" aria-hidden="true"></div>

	<div class="relative flex flex-col gap-3 p-5 sm:flex-row sm:items-start sm:justify-between sm:p-6">
		<div class="min-w-0">
			<h2 class="text-lg font-semibold wrap-anywhere sm:text-xl">{title}</h2>
			<p class="mt-0.5 text-sm text-white/75">{when}</p>
		</div>
		<div class="glass-row flex flex-wrap items-center gap-2">{@render status?.()}</div>
	</div>

	<div class="relative px-5 pb-2 text-center sm:px-6">
		<p class="text-xs font-semibold tracking-wide text-white/75 uppercase">{label}</p>
		<p
			class="mt-2 font-mono text-5xl font-semibold tabular-nums drop-shadow-sm sm:text-7xl"
			data-testid="shift-timer"
		>
			{countdown}
		</p>
		{#if subtitle}<p class="mt-2 text-xs text-white/70">{subtitle}</p>{/if}

		{#if gameMinute !== null}
			<p
				class="mx-auto mt-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-black/20 px-3.5 py-1.5
					text-sm backdrop-blur-sm"
				title={m.host_game_time_hint()}
				data-testid="game-time"
			>
				{#if body?.sun}<IconSun size={16} class="text-amber-200" />{:else}<IconMoon size={16} class="text-indigo-100" />{/if}
				<span class="text-white/75">{m.host_game_time()}</span>
				<span class="font-mono font-semibold tabular-nums">{formatGameTime(gameMinute)}</span>
			</p>
		{/if}
	</div>

	{#if children}
		<div class="relative grid grid-cols-2 gap-2 px-5 pt-3 pb-5 sm:flex sm:flex-wrap sm:justify-center sm:px-6">{@render children()}</div>
	{/if}
</section>

<style>
	.sky {
		background: linear-gradient(180deg, var(--sky-top) 0%, var(--sky-bottom) 100%);
		transition: background 2s linear;
	}
	.shade {
		position: absolute;
		inset: 0;
		z-index: -1;
		background: linear-gradient(180deg, rgb(0 0 0 / 0.05) 0%, rgb(0 0 0 / 0.32) 100%);
	}
	.stars {
		position: absolute;
		inset: 0;
		z-index: -1;
		opacity: 0.55;
		background-image:
			radial-gradient(1px 1px at 12% 22%, white, transparent),
			radial-gradient(1px 1px at 28% 64%, white, transparent),
			radial-gradient(1.5px 1.5px at 41% 18%, white, transparent),
			radial-gradient(1px 1px at 57% 42%, white, transparent),
			radial-gradient(1px 1px at 69% 12%, white, transparent),
			radial-gradient(1.5px 1.5px at 83% 33%, white, transparent),
			radial-gradient(1px 1px at 91% 70%, white, transparent),
			radial-gradient(1px 1px at 6% 80%, white, transparent),
			radial-gradient(1px 1px at 35% 85%, white, transparent),
			radial-gradient(1px 1px at 76% 58%, white, transparent);
	}
	.body {
		position: absolute;
		z-index: -1;
		width: 3.25rem;
		height: 3.25rem;
		border-radius: 9999px;
		transform: translate(-50%, -50%);
		transition:
			left 2s linear,
			top 2s linear;
	}
	.sun {
		background: radial-gradient(circle, #fff7d1 0%, #ffd36b 45%, rgb(255 190 80 / 0) 72%);
		box-shadow: 0 0 60px 24px rgb(255 205 110 / 0.35);
	}
	.moon {
		width: 2.25rem;
		height: 2.25rem;
		background: radial-gradient(circle at 35% 35%, #f4f6ff 0%, #c9d1f2 60%, #aab4e0 100%);
		box-shadow: 0 0 30px 8px rgb(200 210 255 / 0.25);
	}
	.glass-row :global(> *) {
		backdrop-filter: blur(4px);
	}
	@media (max-width: 639px) {
		.body {
			width: 2.25rem;
			height: 2.25rem;
			opacity: 0.8;
		}
		.moon {
			width: 1.75rem;
			height: 1.75rem;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.sky,
		.body {
			transition: none;
		}
	}
</style>
