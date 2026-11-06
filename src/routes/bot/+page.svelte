<script lang="ts">
	import { IconBrandDiscord } from '@tabler/icons-svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import BotPreview from '$lib/components/marketing/BotPreview.svelte';
	import BentoSection from '$lib/components/marketing/BentoSection.svelte';
	import { botSections } from '$lib/components/marketing/botSections';
	import { m } from '$lib/paraglide/messages.js';
	import '$lib/components/marketing/marketing.css';

	// Example text in the languages it is written in, as one multi-language
	// title would appear in a server. Deliberately not translated.
	const titles = [
		{ lang: 'en', text: 'Upcoming shift' },
		{ lang: 'uk', text: 'Наступна зміна' },
		{ lang: 'cs', text: 'Nadcházející směna' },
		{ lang: 'pl', text: 'Nadchodząca zmiana' },
		{ lang: 'de', text: 'Bevorstehende Schicht' }
	];
</script>

<svelte:head><title>{m.marketing_bot()} · TrPTools</title><meta name="description" content={m.marketing_bot_intro()} /></svelte:head>

{#snippet commands()}
	<dl class="commands">
		{#each [{ command: '/edit-shift', body: m.marketing_bot_edit() }, { command: '/status', body: m.marketing_bot_status() }, { command: '/ping', body: m.marketing_bot_ping() }] as row (row.command)}
			<div><dt><code>{row.command}</code></dt><dd>{row.body}</dd></div>
		{/each}
	</dl>
{/snippet}
{#snippet stack()}
	<div class="stack" aria-hidden="true">
		<span class="bar"></span>
		<p>{#each titles as title, i (title.lang)}<span lang={title.lang}>{title.text}</span>{#if i < titles.length - 1}<span class="sep">/</span>{/if}{/each}</p>
		<p class="muted">Daily Service · 19:00</p>
	</div>
{/snippet}

<div class="marketing-page"><div class="marketing">
	<div class="bento pt-10 sm:pt-14">
		<section class="hero-card span-big">
			<div class="dots" aria-hidden="true"></div>
			<p class="eyebrow">{m.marketing_bot_eyebrow()}</p>
			<h1>{m.marketing_bot_hero()}</h1>
			<p class="intro">{m.marketing_bot_intro()}</p>
			<div class="actions">
				<Button href="/dashboard?setup=bot" size="lg"><IconBrandDiscord size={20} />{m.marketing_bot_start()}</Button>
				<Button href="/dashboard?setup=bot" variant="secondary" size="lg">{m.marketing_bot_manage()}</Button>
			</div>
			<p class="hint">{m.marketing_bot_hint()}</p>
		</section>
		<div class="span-big preview"><BotPreview /></div>
	</div>

	<nav class="index" aria-label={m.marketing_index()}>
		{#each botSections as section (section.id)}<a href="#{section.id}" class={section.tint}><section.icon size={14} />{section.eyebrow()}</a>{/each}
	</nav>

	{#each botSections as section (section.id)}
		<BentoSection id={section.id} tint={section.tint} eyebrow={section.eyebrow()} title={section.title()} intro={section.intro()} features={section.features} visuals={{ commands, stack }} />
	{/each}
</div></div>

<style>
	.preview { display:flex; }
	.preview :global(figure) { flex:1; border-radius:22px; }
	.commands > div { display:grid; gap:2px; padding:10px 0; border-top:1px solid var(--border); }
	.commands code { color:var(--accent); font-size:12.5px; }
	.commands dd { font-size:13px; line-height:1.55; color:var(--text-muted); }
	.stack { position:relative; padding:14px 16px 14px 20px; border-radius:10px; background:var(--background-secondary); }
	.stack .bar { position:absolute; inset:0 auto 0 0; width:4px; border-radius:10px 0 0 10px; background:var(--accent); }
	.stack p { font-size:15px; font-weight:600; line-height:1.5; }
	.stack .sep { margin:0 .4em; color:var(--text-subtle); }
	.stack .muted { margin-top:6px; font-size:12px; font-weight:400; color:var(--text-muted); }
</style>
