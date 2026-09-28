<script lang="ts">
	import { IconArrowRight, IconBrandDiscord, IconLink, IconLanguage } from '@tabler/icons-svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import BotPreview from '$lib/components/marketing/BotPreview.svelte';
	import DispatchPreview from '$lib/components/marketing/DispatchPreview.svelte';
	import { m } from '$lib/paraglide/messages.js';
	import '$lib/components/marketing/marketing.css';
</script>
<svelte:head><title>{m.marketing_bot()} · TrPTools</title><meta name="description" content={m.marketing_bot_intro()}/></svelte:head>
<div class="marketing">
	<section class="hero">
		<div><p class="eyebrow">{m.marketing_bot_eyebrow()}</p><h1>{m.marketing_bot_hero()}</h1><p class="intro">{m.marketing_bot_intro()}</p>
			<div class="actions"><Button href="/dashboard?setup=bot" size="lg"><IconBrandDiscord size={20}/>{m.marketing_bot_start()}</Button><Button href="/dashboard?setup=bot" variant="secondary">{m.marketing_bot_manage()}</Button></div><p class="hint">{m.marketing_bot_hint()}</p>
		</div><BotPreview/>
	</section>
	<section class="section !border-t">
		<p class="eyebrow">{m.marketing_bot_automation_title()}</p><h2>{m.marketing_bot_timeline()}</h2><p class="body max-w-2xl">{m.marketing_bot_timeline_body()}</p>
		<ol class="timeline">
			{#each [{command:'/announce',title:m.marketing_bot_announce(),body:m.marketing_bot_announce_body()}, {command:'/signups',title:m.marketing_bot_signup(),body:m.marketing_bot_signup_body()},{command:'/staff-begin',title:m.marketing_bot_staff(),body:m.marketing_bot_staff_body()},{command:'/begin',title:m.marketing_bot_begin(),body:m.marketing_bot_begin_body()},{command:'/complete',title:m.marketing_bot_complete(),body:m.marketing_bot_complete_body()}] as step,i}
				<li><span class="stop" aria-hidden="true">{i+1}</span><code>{step.command}</code><h3>{step.title}</h3><p>{step.body}</p></li>
			{/each}
		</ol>
	</section>
	<section class="section split"><div><p class="eyebrow">{m.marketing_dispatch()}</p><h2>{m.marketing_bot_board_title()}</h2><p class="body">{m.marketing_bot_board_body()}</p></div><DispatchPreview/></section>
	<section class="section two">
		<article><IconLink size={24} stroke={1.5} class="text-accent"/><h2>{m.marketing_bot_identity_title()}</h2><p class="body">{m.marketing_bot_identity_body()}</p><p class="detail">{m.marketing_bot_identity_note()}</p></article>
		<article><IconLanguage size={24} stroke={1.5} class="text-accent"/><h2>{m.marketing_bot_language_title()}</h2><p class="body">{m.marketing_bot_language_body()}</p><p class="detail">{m.marketing_bot_language_note()}</p></article>
	</section>
	<section class="section"><h2>{m.marketing_bot_controls()}</h2><div class="extras">
		{#each [{title:m.marketing_bot_channels_title(),body:m.marketing_bot_channels_body()},{title:m.marketing_bot_automation_title(),body:m.marketing_bot_automation_body()},{title:m.marketing_bot_health_title(),body:m.marketing_bot_health_body()}] as feature}<article><h3>{feature.title}</h3><p>{feature.body}</p></article>{/each}
	</div>
		<h3 class="mt-8">{m.marketing_bot_commands()}</h3><dl class="commands">{#each [{command:'/edit-shift',body:m.marketing_bot_edit()},{command:'/status',body:m.marketing_bot_status()},{command:'/ping',body:m.marketing_bot_ping()}] as row}<div><dt><code>{row.command}</code></dt><dd>{row.body}</dd></div>{/each}</dl>
	</section>
	<section id="setup" class="section"><p class="eyebrow">{m.marketing_bot_setup()}</p><div class="extras">
		{#each [{title:m.marketing_bot_step1(),body:m.marketing_bot_step1_body()},{title:m.marketing_bot_step2(),body:m.marketing_bot_step2_body()},{title:m.marketing_bot_step3(),body:m.marketing_bot_step3_body()}] as step,i}<article><span class="number">0{i+1}</span><h3 class="mt-3">{step.title}</h3><p>{step.body}</p></article>{/each}
	</div><div class="actions"><Button href="/dashboard?setup=bot">{m.marketing_bot_start()}<IconArrowRight size={17}/></Button></div></section>
</div>
<style>
	.timeline { display:grid; grid-template-columns:repeat(5,minmax(0,1fr)); gap:24px; margin-top:32px; }
	.timeline li { position:relative; min-width:0; padding-top:40px; }
	.timeline li::before { content:''; position:absolute; top:12px; left:0; right:-24px; height:1px; background:var(--border-strong); }
	.timeline li:last-child::before { right:0; }
	.stop { position:absolute; top:0; left:0; width:25px; height:25px; display:grid; place-items:center; border:1px solid var(--accent); border-radius:50%; background:var(--background); color:var(--accent); font:11px var(--font-mono); }
	code { color:var(--accent); font-size:12px; }
	.timeline h3 { margin-top:12px; }
	.timeline p,.commands dd { font-size:13px; line-height:1.75; color:var(--text-muted); }
	.commands > div { display:grid; grid-template-columns:150px 1fr; gap:20px; border-top:1px solid var(--border); padding:12px 0; }
	@media(max-width:900px) { .timeline { grid-template-columns:1fr; gap:0; } .timeline li { padding:0 0 24px 44px; } .timeline li::before { top:0; bottom:0; left:12px; width:1px; height:auto; } .timeline li:last-child::before { display:none; } }
	@media(max-width:420px) { .commands > div { grid-template-columns:1fr; gap:4px; } }
</style>
