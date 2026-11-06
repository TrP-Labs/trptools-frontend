<script lang="ts">
	/**
	 * A bento card that turns over.
	 *
	 * The front sells the feature in a sentence; the back says what it
	 * actually does in three terse lines. The flip button is stretched over
	 * the whole card, so a tap anywhere turns it while assistive technology
	 * still meets one ordinary button with a name. Links on the front sit
	 * above that layer and keep working.
	 *
	 * The hidden face is `inert`, which drops focus from a button that just
	 * disappeared — the same trap as a dispatch row disabling itself — so
	 * focus is handed to the button on the face that turned up.
	 */
	import { tick, type Snippet } from 'svelte';
	import { IconArrowRight, IconCheck, IconPlus, IconX } from '@tabler/icons-svelte';
	import Shot from './Shot.svelte';
	import { reveal, tilt } from './motion';
	import type { Feature } from './feature';
	import { m } from '$lib/paraglide/messages.js';

	let { feature, index = 0, visuals = {} }: { feature: Feature; index?: number; visuals?: Record<string, Snippet> } = $props();
	const visual = $derived(feature.visual ? visuals[feature.visual] : undefined);

	let flipped = $state(false);
	let frontButton = $state<HTMLButtonElement>();
	let backButton = $state<HTMLButtonElement>();

	const canFlip = $derived((feature.details?.length ?? 0) > 0);
	const side = $derived(feature.shot?.side ?? 'right');

	async function toggle() {
		const hadFocus = document.activeElement === frontButton || document.activeElement === backButton;
		flipped = !flipped;
		await tick();
		if (hadFocus) (flipped ? backButton : frontButton)?.focus({ preventScroll: true });
	}
</script>

<article
	class="bento-card span-{feature.span ?? 'one'} side-{side}"
	class:accent={feature.tone === 'accent'}
	class:has-shot={Boolean(feature.shot)}
	class:flipped
	style:--delay="{(index % 4) * 70}ms"
	use:reveal
	use:tilt
>
	<div class="inner">
		<div class="face front" inert={flipped}>
			<div class="glow" aria-hidden="true"></div>
			{#if feature.stat}<span class="watermark" aria-hidden="true">{feature.stat}</span>{/if}
			<div class="content">
				{#if feature.stat}
					<p class="stat">{feature.stat}</p>
				{:else if feature.icon}
					<span class="icon"><feature.icon size={22} stroke={1.6} /></span>
				{/if}
				{#if feature.chip}<code class="chip">{feature.chip}</code>{/if}
				<h3>{feature.title()}</h3>
				{#if feature.body}<p class="body">{feature.body()}</p>{/if}
				{#if visual}<div class="visual">{@render visual()}</div>{/if}
				{#if feature.link}
					<a class="link" href={feature.link.href}>{feature.link.label()}<IconArrowRight size={15} /></a>
				{/if}
			</div>
			{#if feature.shot}
				<div class="shot-wrap"><Shot name={feature.shot.name} themed={feature.shot.themed ?? true} /></div>
			{/if}
			{#if canFlip}
				<button
					bind:this={frontButton}
					type="button"
					class="flip"
					aria-expanded={flipped}
					aria-label={m.marketing_card_more({ title: feature.title() })}
					onclick={toggle}
				><span class="flip-icon"><IconPlus size={16} /></span></button>
			{/if}
		</div>

		{#if canFlip}
			<div class="face back" inert={!flipped}>
				<div class="content">
					{#if feature.icon}<span class="icon"><feature.icon size={20} stroke={1.6} /></span>{/if}
					<h3>{feature.title()}</h3>
					<ul>
						{#each feature.details ?? [] as detail, i (i)}
							<li><IconCheck size={15} stroke={2.2} class="mt-0.5 shrink-0 text-accent" />{detail()}</li>
						{/each}
					</ul>
				</div>
				<button
					bind:this={backButton}
					type="button"
					class="flip"
					aria-expanded={flipped}
					aria-label={m.marketing_card_less({ title: feature.title() })}
					onclick={toggle}
				><span class="flip-icon"><IconX size={16} /></span></button>
			</div>
		{/if}
	</div>
</article>

<style>
	.bento-card { --rx:0deg; --ry:0deg; --mx:50%; --my:0%; position:relative; display:grid; min-height:232px; perspective:1600px;
		transform:rotateX(var(--rx)) rotateY(var(--ry)); transition:transform .5s cubic-bezier(.2,.8,.2,1), opacity .7s ease, translate .7s cubic-bezier(.2,.8,.2,1); transition-delay:0s, var(--delay), var(--delay); }
	.bento-card:global([data-reveal='pending']) { opacity:0; translate:0 24px; }
	.bento-card:global([data-tilting]) { transition-duration:.12s, .7s, .7s; }

	.inner { position:relative; display:grid; transform-style:preserve-3d; transition:transform .8s cubic-bezier(.3,1.3,.4,1); }
	.flipped .inner { transform:rotateY(180deg); }

	.face { grid-area:1/1; position:relative; display:flex; flex-direction:column; overflow:hidden; border:1px solid var(--border); border-radius:22px;
		background:var(--surface); backface-visibility:hidden; -webkit-backface-visibility:hidden; transition:border-color .3s; }
	.bento-card:hover .face { border-color:var(--border-strong); }
	.back { transform:rotateY(180deg); background:radial-gradient(120% 90% at 100% 0%, color-mix(in srgb, var(--accent) 16%, transparent), transparent 60%), var(--surface); }

	.glow { position:absolute; inset:0; pointer-events:none; opacity:0; transition:opacity .4s;
		background:radial-gradient(420px circle at var(--mx) var(--my), color-mix(in srgb, var(--accent) 12%, transparent), transparent 60%); }
	.bento-card:hover .glow { opacity:1; }

	.content { position:relative; z-index:1; display:flex; flex-direction:column; align-items:flex-start; padding:28px 28px 26px; }
	.front .content { flex:1; }
	.icon { display:grid; place-items:center; width:42px; height:42px; margin-bottom:22px; border-radius:12px; color:var(--accent);
		background:color-mix(in srgb, var(--accent) 12%, transparent); border:1px solid color-mix(in srgb, var(--accent) 22%, transparent); }
	h3 { font-size:17px; font-weight:600; letter-spacing:-.015em; line-height:1.3; text-wrap:balance; padding-right:28px; }
	.body { margin-top:10px; color:var(--text-muted); font-size:14px; line-height:1.65; max-width:46ch; }
	.chip { margin-bottom:16px; padding:4px 10px; border-radius:8px; font:600 12px var(--font-mono); color:var(--accent);
		background:color-mix(in srgb, var(--accent) 10%, transparent); border:1px solid color-mix(in srgb, var(--accent) 22%, transparent); }
	.visual { width:100%; margin-top:18px; }
	.link { position:relative; z-index:3; display:inline-flex; align-items:center; gap:8px; margin-top:auto; padding-top:18px; font-size:13px; font-weight:500; color:var(--accent); }
	.link:hover { text-decoration:underline; text-underline-offset:3px; }

	.stat { font-size:clamp(46px,5vw,64px); font-weight:800; letter-spacing:-.05em; line-height:1; color:var(--accent); margin-bottom:18px; }
	.watermark { position:absolute; right:-18px; bottom:-46px; font-size:170px; font-weight:900; letter-spacing:-.06em; line-height:1; pointer-events:none;
		color:color-mix(in srgb, var(--accent) 6%, transparent); }

	ul { display:grid; gap:12px; margin-top:18px; }
	li { display:flex; gap:10px; font-size:14px; line-height:1.5; color:var(--text); }
	/* A big card's back has room to say it at reading size. */
	.span-big .back .content, .span-wide .back .content { flex:1; justify-content:center; padding:clamp(28px,4vw,48px); }
	.span-big .back h3 { font-size:clamp(22px,2.4vw,28px); }
	.span-big .back ul { gap:18px; margin-top:26px; }
	.span-big .back li { font-size:16px; }

	/* The button covers the card; its visible part is the corner chip. */
	.flip { position:absolute; inset:0; z-index:2; cursor:pointer; border-radius:22px; }
	.flip:focus-visible { outline-offset:-2px; border-radius:22px; }
	.flip-icon { position:absolute; top:18px; right:18px; display:grid; place-items:center; width:30px; height:30px; border-radius:50%;
		color:var(--text-muted); border:1px solid var(--border); background:color-mix(in srgb, var(--surface) 80%, transparent); backdrop-filter:blur(6px);
		transition:transform .35s cubic-bezier(.3,1.4,.5,1), color .2s, border-color .2s; }
	.bento-card:hover .front .flip-icon { transform:rotate(90deg); color:var(--accent); border-color:color-mix(in srgb, var(--accent) 45%, transparent); }

	/* Screenshots fade into the card on the side the words sit. */
	.shot-wrap { position:relative; pointer-events:none; }
	.shot-wrap :global(.shot) { width:max(620px, 118%); }
	.span-big.side-right .shot-wrap :global(.shot) { width:max(900px, 170%); }
	.span-wide.side-right .shot-wrap :global(.shot) { width:max(720px, 150%); }
	.has-shot.side-right:is(.span-big, .span-wide) .front .content { max-width:44%; }
	.has-shot.side-right:is(.span-big, .span-wide) .shot-wrap { position:absolute; top:30px; bottom:0; left:40%; right:0;
		-webkit-mask-image:linear-gradient(90deg, transparent, #000 22%), linear-gradient(180deg, #000 62%, transparent);
		mask-image:linear-gradient(90deg, transparent, #000 22%), linear-gradient(180deg, #000 62%, transparent);
		-webkit-mask-composite:source-in; mask-composite:intersect; }
	.has-shot:is(.side-bottom, .span-one, .span-tall) .shot-wrap,
	.has-shot.side-right:not(.span-big, .span-wide) .shot-wrap { flex:1; min-height:190px; margin-left:28px; overflow:hidden;
		-webkit-mask-image:linear-gradient(180deg, #000 45%, transparent), linear-gradient(90deg, #000 70%, transparent);
		mask-image:linear-gradient(180deg, #000 45%, transparent), linear-gradient(90deg, #000 70%, transparent);
		-webkit-mask-composite:source-in; mask-composite:intersect; }
	.has-shot:is(.side-bottom, .span-one, .span-tall) .shot-wrap :global(.shot) { position:absolute; top:0; left:0; }
	.has-shot.side-bottom .content { flex:none; }
	.span-big.has-shot .shot-wrap { min-height:280px; }

	.accent .front { border-color:transparent; color:var(--accent-contrast);
		background:radial-gradient(90% 120% at 100% 100%, color-mix(in srgb, #fff 18%, transparent), transparent 55%), var(--accent); }
	.accent .front .body { color:color-mix(in srgb, var(--accent-contrast) 78%, transparent); }
	.accent .front .icon { color:var(--accent-contrast); background:color-mix(in srgb, var(--accent-contrast) 12%, transparent); border-color:transparent; }
	.accent .front h3 { font-size:22px; }
	.accent .front .link { color:var(--accent-contrast); margin-top:auto; padding:9px 16px; border-radius:999px; background:color-mix(in srgb, var(--accent-contrast) 14%, transparent); }

	@media (max-width:639px) {
		.bento-card { min-height:0; }
		.has-shot.side-right:is(.span-big, .span-wide) .content { max-width:none; }
		.has-shot.side-right:is(.span-big, .span-wide) .shot-wrap { position:relative; inset:auto; flex:1; min-height:220px; margin-left:24px; overflow:hidden;
			-webkit-mask-image:linear-gradient(180deg, #000 45%, transparent), linear-gradient(90deg, #000 70%, transparent);
			mask-image:linear-gradient(180deg, #000 45%, transparent), linear-gradient(90deg, #000 70%, transparent); }
		.has-shot .shot-wrap :global(.shot) { position:absolute; top:0; left:0; width:560px; }
		.content { padding:24px; }
	}
	@media (prefers-reduced-motion:reduce) {
		.bento-card { transform:none; }
		.inner { transition:none; }
		.flipped .inner { transform:none; }
		.face { backface-visibility:visible; transition:opacity .2s; }
		.back { transform:none; opacity:0; }
		.flipped .back { opacity:1; }
		.flipped .front { opacity:0; }
	}
</style>
