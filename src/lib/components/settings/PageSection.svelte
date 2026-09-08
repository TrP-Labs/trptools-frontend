<script lang="ts">
	import { refreshData } from '$lib/utils/refresh';
	import Card from '$lib/components/ui/Card.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Field from '$lib/components/ui/Field.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import ColorInput from '$lib/components/ui/ColorInput.svelte';
	import TranslatableField from '$lib/components/i18n/TranslatableField.svelte';
	import LanguageMenu from '$lib/components/i18n/LanguageMenu.svelte';
	import Flag from '$lib/components/ui/Flag.svelte';
	import IconUploader from '$lib/components/media/IconUploader.svelte';
	import { languageName } from '$lib/utils/languages';
	import { api, errorMessage } from '$lib/api/client';
	import { toasts } from '$lib/stores/toast.svelte';
	import type { Translations } from '$lib/utils/translations';
	import { m } from '$lib/paraglide/messages.js';

	/**
	 * What the group is called and what its page says.
	 *
	 * Saved on its own rather than with the rest of settings: the API checks
	 * each part of the form against the grant that owns it, so a rank holding
	 * only this one must not send fields it cannot save.
	 */
	interface Props {
		group: {
			id: string;
			slug: string;
			name: string;
			nameIsCustom: boolean;
			robloxName: string | null;
			tagline: string;
			about: string;
			sourceLocale: string;
			translations: Translations;
			accentColor: string;
			bannerImage: string | null;
		};
	}

	let { group }: Props = $props();

	// Seeded from the loaded group, then owned by the form until saved. Re-seeded
	// after a save invalidates, so the form always reflects what was stored.
	let form = $state(seed());

	function seed() {
		return {
			slug: group.slug,
			// Blank means "follow the Roblox name", which is where every group
			// starts and what clearing the box goes back to.
			name: group.nameIsCustom ? group.name : '',
			tagline: group.tagline,
			about: group.about,
			sourceLocale: group.sourceLocale,
			translations: structuredClone(group.translations),
			accentColor: group.accentColor
		};
	}

	let saving = $state(false);

	async function save() {
		saving = true;
		try {
			const { error } = await api.groups({ groupId: group.id }).patch({ ...form });
			if (error) throw error;

			toasts.success(m.dashboard_settings_settings_saved());
			await refreshData();
			form = seed();
		} catch (error) {
			toasts.error(errorMessage(error, m.dashboard_settings_could_not_save_those_settings()));
		} finally {
			saving = false;
		}
	}
</script>

<Card title={m.common_public_page()} description={m.dashboard_settings_what_people_see_at_group_s()}>
	<div class="grid gap-4 sm:grid-cols-2">
		<Field
			label={m.translate_group_name()}
			hint={form.name.trim()
				? m.translate_group_name_hint()
				: m.translate_following_roblox({ name: group.robloxName ?? group.name })}
			class="sm:col-span-2"
		>
			<TranslatableField
				bind:value={form.name}
				bind:translations={form.translations}
				field="name"
				sourceLocale={form.sourceLocale}
				maxlength={100}
				placeholder={group.robloxName ?? group.name}
			/>
		</Field>

		<Field label={m.dashboard_settings_page_address()} hint={m.dashboard_settings_letters_numbers_dashes()}>
			<div class="flex items-center gap-1.5">
				<span class="shrink-0 text-sm text-text-subtle">/g/</span>
				<Input bind:value={form.slug} maxlength={48} spellcheck="false" />
			</div>
		</Field>

		<Field label={m.dashboard_settings_accent_color()}>
			<ColorInput bind:value={form.accentColor} />
		</Field>

		<Field
			label={m.dashboard_settings_tagline()}
			hint={m.dashboard_settings_one_line_shown_under_group_name()}
			class="sm:col-span-2"
		>
			<TranslatableField
				bind:value={form.tagline}
				bind:translations={form.translations}
				field="tagline"
				sourceLocale={form.sourceLocale}
				maxlength={160}
				placeholder={m.dashboard_settings_short_description()}
			/>
		</Field>

		<Field label={m.common_about()} class="sm:col-span-2">
			<TranslatableField
				bind:value={form.about}
				bind:translations={form.translations}
				field="about"
				sourceLocale={form.sourceLocale}
				multiline
				rows={4}
				maxlength={4000}
				placeholder={m.dashboard_settings_tell_people_what_group_does()}
			/>
		</Field>

		<!--
			The language everything above is written in, and what a reader falls
			back to when there is no version in theirs. Set from whoever
			registered the group rather than assumed to be English: a group that
			runs in Ukrainian would otherwise have its own words filed as the
			English original.
		-->
		<Field
			label={m.translate_source_language()}
			hint={m.translate_source_language_description()}
			class="sm:col-span-2"
		>
			<LanguageMenu
				current={form.sourceLocale}
				align="left"
				label={m.translate_source_language()}
				onpick={(locale) => (form.sourceLocale = locale)}
			>
				{#snippet trigger({ open, toggle })}
					<button
						type="button"
						aria-haspopup="menu"
						aria-expanded={open}
						onclick={toggle}
						lang={form.sourceLocale}
						class="flex items-center gap-2 rounded-lg border border-border-base
							bg-background-secondary px-3 py-2 text-sm text-text transition-colors
							hover:border-border-strong"
					>
						<Flag
							locale={form.sourceLocale}
							class="h-3.5 w-5 shrink-0 rounded-xs ring-1 ring-black/20"
						/>
						{languageName(form.sourceLocale)}
					</button>
				{/snippet}
			</LanguageMenu>
		</Field>

		<div class="sm:col-span-2">
			<IconUploader
				groupId={group.id}
				ownerType="GROUP"
				current={group.bannerImage}
				label={m.dashboard_settings_banner_image()}
				hint={m.dashboard_settings_sits_behind_group_name_public_page()}
				aspect="wide"
			/>
		</div>
	</div>

	{#snippet actions()}
		<Button onclick={save} loading={saving}>{m.common_save()}</Button>
	{/snippet}
</Card>
