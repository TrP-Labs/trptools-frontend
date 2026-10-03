<script lang="ts">
    import { IconFileText, IconPhoto, IconUsers, IconEye } from '@tabler/icons-svelte';
    import ObjectPage from '$lib/components/layout/ObjectPage.svelte';
    import Field from '$lib/components/ui/Field.svelte';
    import Button from '$lib/components/ui/Button.svelte';
    import Toggle from '$lib/components/ui/Toggle.svelte';
    import Select from '$lib/components/ui/Select.svelte';
    import TranslatableField from '$lib/components/i18n/TranslatableField.svelte';
    import ImageManager from '$lib/components/media/ImageManager.svelte';
    import ShiftDetails from '$lib/components/shifts/ShiftDetails.svelte';
    import { api, errorMessage } from '$lib/api/client';
    import { refreshData } from '$lib/utils/refresh';
    import { toasts } from '$lib/stores/toast.svelte';
    import { formatDateTime } from '$lib/utils/format';
    import { m } from '$lib/paraglide/messages.js';
    import type { PageProps } from './$types';
    let { data }: PageProps = $props();
    const initial = () => data.shift;
    let translations = $state(structuredClone(initial().translations));
    let description = $state(initial().description);
    let postDescription = $state(initial().postDescription);
    let publicStaff = $state(initial().publicStaff);
    let publicDrivers = $state(initial().publicDrivers);
    let showVoters = $state(initial().showVoters);
    let visibility = $state(initial().visibility);
    let busy = $state(false);
    $effect(() => {
        const shift = data.shift;
        translations = structuredClone(shift.translations); description = shift.description; postDescription = shift.postDescription;
        publicStaff = shift.publicStaff; publicDrivers = shift.publicDrivers; showVoters = shift.showVoters; visibility = shift.visibility;
    });
    const sections = $derived([
        { id: 'description', label: m.shifts_content(), icon: IconFileText },
        { id: 'images', label: m.shifts_images(), icon: IconPhoto },
        { id: 'participants', label: m.shifts_participants(), icon: IconUsers },
        { id: 'visibility', label: m.shifts_rule_visibility(), icon: IconEye }
    ]);
    async function save(section: string) {
        busy = true;
        try {
            const { error } = await api.schedule.instances({ id: data.shift.id }).patch(section === 'description' ? { description, postDescription, translations } : { publicStaff, publicDrivers, showVoters, visibility });
            if (error) throw error;
            toasts.success(m.shifts_content_saved());
        } catch (error) { toasts.error(errorMessage(error, m.shifts_content_error())); return; }
        finally { busy = false; }
        await refreshData();
    }
</script>
<ObjectPage backHref="/dashboard/{data.group.slug}/shifts" backLabel={m.common_shifts()} title={data.shift.name} description={formatDateTime(data.shift.start)} accent={data.shift.color} {sections}>
    {#snippet actions()}<Button variant="secondary" href="/g/{data.group.slug}/shift/{data.shift.slug}/{new Date(data.shift.start).getTime()}">{m.shifts_page()}</Button>{/snippet}
    {#snippet children(section)}
        {#if section === 'images'}<ImageManager groupId={data.group.id} ownerType="SHIFT" ownerId={data.shift.id} images={data.shift.images} label={m.shifts_images()} />
        {:else if section === 'participants'}<ShiftDetails shift={data.shift} user={data.user} />
        {:else}<section class="card max-w-3xl space-y-5 p-5">
            {#if section === 'description'}
                <Field label={m.shifts_pre_description()}><TranslatableField field="description" sourceLocale={data.group.sourceLocale} bind:translations multiline bind:value={description} maxlength={10000} rows={6} /></Field>
                <Field label={m.shifts_post_description()} hint={m.shifts_post_hint()}><TranslatableField field="postDescription" sourceLocale={data.group.sourceLocale} bind:translations multiline bind:value={postDescription} maxlength={10000} rows={6} /></Field>
            {:else}
                <Field label={m.common_visibility()}><Select bind:value={visibility} options={[{ value: 'PUBLIC', label: m.common_public() }, { value: 'PRIVATE', label: m.common_members_only() }]} /></Field>
                <Toggle bind:checked={publicStaff} label={m.shifts_public_staff()} description={m.shifts_public_history_hint()} />
                <Toggle bind:checked={publicDrivers} label={m.shifts_public_drivers()} />
                <Toggle bind:checked={showVoters} label={m.shifts_demand_show()} description={m.shifts_demand_show_hint()} />
            {/if}
            <Button loading={busy} onclick={() => save(section)}>{m.common_save_changes()}</Button>
        </section>{/if}
    {/snippet}
</ObjectPage>
