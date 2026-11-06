<script lang="ts">
	import { IconArrowRight, IconLanguage, IconRadio, IconUsersGroup } from '@tabler/icons-svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import BentoSection from './BentoSection.svelte';
	import FeatureCard from './FeatureCard.svelte';
	import { homeSections } from './homeSections';
	import { m } from '$lib/paraglide/messages.js';
	import { languageName, SITE_LOCALES } from '$lib/utils/languages';
	import './marketing.css';
</script>

{#snippet keys()}
	<div class="keys" aria-hidden="true"><kbd>\</kbd><kbd>↑</kbd><kbd>↓</kbd><kbd>←</kbd><kbd>→</kbd><kbd>1–4</kbd></div>
{/snippet}
{#snippet languages()}
	<div class="langs" aria-hidden="true">{#each SITE_LOCALES as locale (locale)}<span lang={locale}>{languageName(locale)}</span>{/each}</div>
{/snippet}

<div class="marketing-page"><div class="marketing">
	<div class="bento pt-10 sm:pt-14">
		<section class="hero-card span-big">
			<div class="dots" aria-hidden="true"></div>
			<p class="eyebrow">{m.marketing_eyebrow()}</p>
			<h1>{m.marketing_hero()}</h1>
			<p class="intro">{m.marketing_intro()}</p>
			<div class="actions">
				<Button href="/dashboard" size="lg">{m.marketing_start()}<IconArrowRight size={17} /></Button>
				<Button href="/tools/dispatch" variant="secondary" size="lg">{m.marketing_try()}</Button>
			</div>
			<p class="hint">{m.marketing_no_account()}</p>
		</section>
		<FeatureCard index={1} feature={{ title: m.marketing_hero_since, body: m.marketing_hero_since_body, stat: '2023' }} />
		<FeatureCard index={2} visuals={{ languages }} feature={{ title: m.marketing_hero_lang_title, body: m.marketing_hero_lang_body, icon: IconLanguage, visual: 'languages' }} />
		<FeatureCard index={3} feature={{ title: m.marketing_hero_cta_title, body: m.marketing_hero_cta_body, span: 'wide', tone: 'accent', link: { href: '/dashboard', label: m.marketing_start } }} />
	</div>

	<nav class="index" aria-label={m.marketing_index()}>
		{#each homeSections as section (section.id)}
			<a href="#{section.id}" class={section.tint}><section.icon size={14} />{section.eyebrow()}</a>
		{/each}
	</nav>

	{#each homeSections as section (section.id)}
		<BentoSection id={section.id} tint={section.tint} eyebrow={section.eyebrow()} title={section.title()} intro={section.intro()} features={section.features} visuals={{ keys, languages }} />
	{/each}

	<section class="section" aria-labelledby="end-title">
		<div class="bento">
			<div class="hero-card span-wide end">
				<div class="dots" aria-hidden="true"></div>
				<h2 id="end-title">{m.marketing_end_title()}</h2>
				<p class="intro">{m.marketing_end_body()}</p>
				<div class="actions">
					<Button href="/dashboard" size="lg">{m.marketing_start()}<IconArrowRight size={17} /></Button>
					<Button href="/tools/dispatch" variant="secondary" size="lg">{m.marketing_try()}</Button>
				</div>
			</div>
			<FeatureCard feature={{ title: m.marketing_groups_link, body: m.marketing_groups_body, icon: IconUsersGroup, link: { href: '/groups', label: m.marketing_groups_link } }} />
			<FeatureCard index={1} feature={{ title: m.marketing_tools_link, body: m.marketing_tools_body, icon: IconRadio, link: { href: '/tools', label: m.marketing_tools_link } }} />
		</div>
	</section>
</div></div>

<style>
	.end h2 { margin:0 0 12px; font-size:clamp(26px,3.2vw,38px); font-weight:700; letter-spacing:-.035em; line-height:1.1; text-wrap:balance; }
	.keys { display:flex; flex-wrap:wrap; gap:6px; }
	.keys kbd { min-width:30px; padding:4px 8px; border:1px solid var(--border-strong); border-bottom-width:3px; border-radius:8px;
		background:var(--background-secondary); font:600 12px var(--font-mono); text-align:center; color:var(--text); }
	.langs { display:flex; flex-wrap:wrap; gap:6px; }
	.langs span { padding:3px 9px; border:1px solid var(--border); border-radius:999px; font-size:11.5px; color:var(--text-muted); background:var(--background-secondary); }
</style>
