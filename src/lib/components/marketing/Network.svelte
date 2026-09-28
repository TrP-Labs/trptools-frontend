<script lang="ts">
	import { m } from '$lib/paraglide/messages.js';
</script>

<figure class="network">
	<div class="legend"><span>{m.marketing_example()}</span><span class="font-mono">TrP / 01</span></div>
	<svg viewBox="0 0 560 330" fill="none" role="img" aria-label={m.marketing_network_caption()}>
		<defs>
			<pattern id="network-grid" width="24" height="24" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r="1" fill="currentColor" opacity=".14" /></pattern>
		</defs>
		<rect width="560" height="330" fill="url(#network-grid)" />
		<g stroke-linecap="round" stroke-linejoin="round" stroke-width="8">
			<path d="M55 238H156Q172 238 184 226L304 106Q316 94 334 94" stroke="#6e6ec4" />
			<path d="M55 118H159Q175 118 187 130L303 246Q315 258 333 258H506" stroke="#bbce64" />
			<path d="M55 278H126Q142 278 142 262V65Q142 49 158 49H389Q405 49 405 65V278" stroke="#d5a55d" />
			<path d="M55 158H127Q143 158 155 170L202 217Q214 229 230 229H351Q367 229 367 213V150Q367 134 383 134H506" stroke="#b69cdd" stroke-dasharray="2 13" />
		</g>
		<g fill="var(--surface)" stroke="var(--text)" stroke-width="3">
			<circle cx="142" cy="118" r="10"/><circle cx="244" cy="166" r="10"/><circle cx="405" cy="94" r="10"/>
			<circle cx="405" cy="258" r="10"/><circle cx="90" cy="238" r="6"/><circle cx="334" cy="49" r="6"/>
		</g>
		<g fill="var(--text)" font-family="var(--font-sans)" font-size="13" font-weight="600">
			<text x="55" y="95">{m.marketing_depot_main()}</text><text x="319" y="307">{m.marketing_depot_cat()}</text>
		</g>
		<g font-family="var(--font-mono)" font-size="14" font-weight="700" text-anchor="middle" fill="#18222c">
			<rect x="312" y="77" width="45" height="32" rx="5" fill="#6e6ec4"/><text x="334" y="99" fill="#fff">14</text>
			<rect x="472" y="241" width="45" height="32" rx="5" fill="#bbce64"/><text x="495" y="263">10</text>
			<rect x="382" y="32" width="45" height="32" rx="5" fill="#d5a55d"/><text x="405" y="54">6</text>
			<rect x="459" y="119" width="58" height="32" rx="16" fill="#b69cdd"/><text x="488" y="141">N1</text>
		</g>
	</svg>
	<figcaption><span class="custom-dot"></span>{m.marketing_custom()} <span class="ml-auto font-mono">N1</span></figcaption>
</figure>

<style>
	.network { background:var(--surface); border:1px solid var(--border); border-radius:12px; overflow:hidden; transform:rotate(-2deg); }
	.legend, figcaption { display:flex; align-items:center; justify-content:space-between; gap:12px; padding:16px 20px; font-size:11px; color:var(--text-muted); }
	.legend { border-bottom:1px solid var(--border); text-transform:uppercase; letter-spacing:.09em; }
	svg { width:100%; height:auto; }
	figcaption { border-top:1px solid var(--border); justify-content:flex-start; }
	.custom-dot { width:9px; height:9px; border-radius:50%; background:#b69cdd; }
	@media(max-width:640px) { .network { transform:none; } }
</style>
