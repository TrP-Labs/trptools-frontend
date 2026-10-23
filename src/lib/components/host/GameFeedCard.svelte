<script lang="ts">
	/**
	 * Whether a hosted server is feeding this group, and how recently.
	 *
	 * The feed is the host's to keep an eye on: when it stops, the board stops
	 * following the game and commands stop reaching drivers, so the seconds
	 * since the last report are drawn large and go amber, then red, as they
	 * climb past what the game's own retry intervals would explain.
	 */
	import { IconBroadcast, IconBroadcastOff } from '@tabler/icons-svelte';
	import type { GameStatus } from '$lib/api/types';
	import { m } from '$lib/paraglide/messages.js';

	interface Props {
		game: GameStatus | null;
		/** This browser's time when `game` arrived, to measure age without clock skew. */
		receivedAt: number;
		now: number;
		live: boolean;
	}

	let { game, receivedAt, now, live }: Props = $props();

	/** Seconds since the server last reported, by this browser's clock. */
	let age = $derived.by(() => {
		if (!game?.lastAt) return null;
		// The status was already this old when it reached us.
		const atReceipt = Math.max(0, receivedAt - game.lastAt);
		return Math.max(0, Math.round((now - receivedAt + Math.min(atReceipt, 5000)) / 1000));
	});

	let runtime = $derived.by(() => {
		if (game?.runtime == null || age === null) return null;
		const total = game.runtime + (live ? age : 0);
		const hours = Math.floor(total / 3600);
		const minutes = Math.floor((total % 3600) / 60);
		const seconds = total % 60;
		const pad = (value: number) => String(value).padStart(2, '0');
		return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${minutes}:${pad(seconds)}`;
	});

	let tone = $derived(!live ? 'off' : age !== null && age > 35 ? 'slow' : 'ok');
</script>

<section class="card p-5" data-testid="game-feed">
	<div class="flex items-center justify-between gap-3">
		<h2 class="flex items-center gap-2 font-semibold text-text">
			{#if live}<IconBroadcast size={18} class="text-success" />{:else}<IconBroadcastOff size={18} class="text-text-subtle" />{/if}
			{m.host_feed_title()}
		</h2>
		<span class="pill {tone}">
			<span class="dot"></span>
			{live ? m.host_feed_live() : game?.lastAt ? m.host_feed_stopped() : m.host_feed_none()}
		</span>
	</div>

	{#if game?.lastAt}
		<dl class="mt-4 grid grid-cols-2 gap-x-4 gap-y-3">
			<div class="col-span-2">
				<dt class="text-xs text-text-muted">{m.host_feed_last_report()}</dt>
				<dd class="mt-0.5 font-mono text-3xl font-semibold tabular-nums age {tone}" data-testid="feed-age">
					{m.host_feed_seconds_ago({ seconds: age ?? 0 })}
				</dd>
			</div>
			<div>
				<dt class="text-xs text-text-muted">{m.host_feed_runtime()}</dt>
				<dd class="mt-0.5 font-mono text-lg font-semibold text-text tabular-nums" data-testid="feed-runtime">{runtime ?? '—'}</dd>
			</div>
			<div>
				<dt class="text-xs text-text-muted">{m.host_feed_players()}</dt>
				<dd class="mt-0.5 font-mono text-lg font-semibold text-text tabular-nums">{game.players}</dd>
			</div>
			<div>
				<dt class="text-xs text-text-muted">{m.host_feed_queued()}</dt>
				<dd class="mt-0.5 font-mono text-lg font-semibold text-text tabular-nums">{game.queued}</dd>
			</div>
			<div>
				<dt class="text-xs text-text-muted">{m.host_feed_routes()}</dt>
				<dd class="mt-0.5 truncate text-sm font-medium text-text" title={game.routes?.join(', ')}>
					{game.routes?.length ? game.routes.join(', ') : '—'}
				</dd>
			</div>
		</dl>
		{#if !live}<p class="mt-4 text-xs text-text-muted">{m.host_feed_stopped_hint()}</p>{/if}
	{:else}
		<p class="mt-3 text-sm text-text-muted">{m.host_feed_none_hint()}</p>
	{/if}
</section>

<style>
	.pill {
		display: inline-flex;
		align-items: center;
		gap: 0.375rem;
		border-radius: 9999px;
		border: 1px solid var(--color-border-base);
		padding: 0.125rem 0.625rem;
		font-size: 0.75rem;
		font-weight: 500;
		color: var(--color-text-muted);
	}
	.dot {
		width: 0.5rem;
		height: 0.5rem;
		border-radius: 9999px;
		background: currentColor;
	}
	.pill.ok {
		border-color: color-mix(in srgb, var(--color-success) 40%, transparent);
		color: var(--color-success);
	}
	.pill.slow {
		border-color: color-mix(in srgb, var(--color-warning) 40%, transparent);
		color: var(--color-warning);
	}
	.age.ok {
		color: var(--color-text);
	}
	.age.slow {
		color: var(--color-warning);
	}
	.age.off {
		color: var(--color-danger);
	}
</style>
