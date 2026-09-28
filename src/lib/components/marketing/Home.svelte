<script lang="ts">
	import { IconArrowRight, IconRoute, IconRadio, IconCalendarTime, IconBrandDiscord, IconClipboardList, IconLanguage } from '@tabler/icons-svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Network from './Network.svelte';
	import DispatchPreview from './DispatchPreview.svelte';
	import { m } from '$lib/paraglide/messages.js';
	import './marketing.css';
</script>
<div class="marketing">
	<section class="hero">
		<div>
			<p class="eyebrow">{m.marketing_eyebrow()}</p>
			<h1>{m.marketing_hero()}</h1><p class="intro">{m.marketing_intro()}</p>
			<div class="actions"><Button href="/dashboard" size="lg">{m.marketing_start()}<IconArrowRight size={17}/></Button><Button href="/tools/dispatch" variant="secondary" size="lg">{m.marketing_try()}</Button></div>
			<p class="hint">{m.marketing_no_account()}</p>
		</div>
		<Network />
	</section>
	<nav class="index" aria-label={m.marketing_index()}>
		<a href="#routes">{m.marketing_routes()}</a><a href="#dispatch">{m.marketing_dispatch()}</a><a href="#shifts">{m.marketing_shifts()}</a><a href="#applications">{m.marketing_applications()}</a><a href="#languages">{m.marketing_languages()}</a><a href="/bot">{m.marketing_bot()} ↗</a>
	</nav>
	<section id="routes" class="section split">
		<div><p class="eyebrow"><span class="number">01</span>{m.marketing_routes()}</p><h2>{m.marketing_routes_title()}</h2></div>
		<div><p class="body">{m.marketing_routes_body()}</p><p class="detail">{m.marketing_routes_detail()}</p></div>
	</section>
	<section id="dispatch" class="section split">
		<div><IconRadio size={24} stroke={1.5} class="text-accent"/><h2>{m.marketing_dispatch_title()}</h2><p class="body">{m.marketing_dispatch_body()}</p><p class="detail">{m.marketing_dispatch_detail()}</p><a class="link" href="/tools/dispatch">{m.marketing_try()}<IconArrowRight size={16}/></a></div>
		<DispatchPreview/>
	</section>
	<section id="shifts" class="section two">
		<article><IconCalendarTime size={24} stroke={1.5} class="text-accent"/><h2>{m.marketing_shifts_title()}</h2><p class="body">{m.marketing_shifts_body()}</p><p class="detail">{m.marketing_shifts_detail()}</p></article>
		<article><IconBrandDiscord size={24} stroke={1.5} class="text-accent"/><h2>{m.marketing_linked_title()}</h2><p class="body">{m.marketing_linked_body()}</p><p class="detail">{m.marketing_linked_detail()}</p><a class="link" href="/bot">{m.marketing_bot_link()}<IconArrowRight size={16}/></a></article>
	</section>
	<section class="section two">
		<article id="applications" class="scroll-mt-20"><IconClipboardList size={24} stroke={1.5} class="text-accent"/><h2>{m.marketing_apps_title()}</h2><p class="body">{m.marketing_apps_body()}</p><p class="detail">{m.marketing_apps_detail()}</p></article>
		<article id="languages" class="scroll-mt-20"><IconLanguage size={24} stroke={1.5} class="text-accent"/><h2>{m.marketing_language_title()}</h2><p class="body">{m.marketing_language_body()}</p><p class="detail">{m.marketing_language_detail()}</p><div class="mt-6 flex flex-wrap gap-2 font-mono text-xs text-text-muted" aria-hidden="true">{#each ['English','Deutsch','Français','Українська','Русский'] as language}<span class="rounded border border-border-base px-2 py-1">{language}</span>{/each}</div></article>
	</section>
	<section class="section">
		<p class="eyebrow"><span class="number">02</span>TrPTools</p><h2>{m.marketing_more()}</h2>
		<div class="extras">
			{#each [{title:m.marketing_public_title(),body:m.marketing_public_body()},{title:m.marketing_access_title(),body:m.marketing_access_body()},{title:m.marketing_host_title(),body:m.marketing_host_body()},{title:m.marketing_stage_title(),body:m.marketing_stage_body()},{title:m.marketing_api_title(),body:m.marketing_api_body()}] as feature}
				<article><h3>{feature.title}</h3><p>{feature.body}</p></article>
			{/each}
			<article class="flex flex-col items-start"><a class="link !mt-0" href="/tools">{m.marketing_tools_link()}<IconArrowRight size={16}/></a><a class="link" href="/groups">{m.marketing_groups_link()}<IconArrowRight size={16}/></a></article>
		</div>
	</section>
	<div class="end"><span class="flex items-center gap-3 text-sm text-text-muted"><IconRoute size={20}/>{m.marketing_network_caption()}</span><Button href="/dashboard">{m.marketing_start()}<IconArrowRight size={16}/></Button></div>
</div>
