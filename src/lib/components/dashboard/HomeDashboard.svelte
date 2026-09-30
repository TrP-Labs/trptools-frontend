<script lang="ts">
    import { goto } from '$app/navigation';
    import { IconArrowDown, IconArrowUp, IconGripVertical, IconPlus, IconX, IconAdjustments } from '@tabler/icons-svelte';
    import Button from '$lib/components/ui/Button.svelte';
    import Modal from '$lib/components/ui/Modal.svelte';
    import HomeWidget from './HomeWidget.svelte';
    import { widgetCatalog, defaultLayouts } from './widgetCatalog';
    import { api, errorMessage } from '$lib/api/client';
    import { refreshData } from '$lib/utils/refresh';
    import { toasts } from '$lib/stores/toast.svelte';
    import { m } from '$lib/paraglide/messages.js';
    import type { DashboardData, HomeLayout, SessionUser } from '$lib/api/types';
    let { dashboard, user }: { dashboard: DashboardData; user: SessionUser } = $props();
    let mode = $derived(dashboard.mode);
    let catalog = $derived(widgetCatalog(mode));
    // svelte-ignore state_referenced_locally
    let layout = $state<HomeLayout>(structuredClone(user.homeLayout));
    let editing = $state(false);
    let picker = $state(false);
    let saving = $state(false);
    let switching = $state(false);
    let dragging = $state<string | null>(null);
    let announcement = $state('');
    let pinning = $state<string | null>(null);
    let widgets = $derived(layout[mode]);
    let greeting = $derived.by(() => {
        const hour = new Date().getHours();
        return hour < 5 ? m.home_greeting_still_up() : hour < 12 ? m.home_greeting_good_morning() : hour < 18 ? m.home_greeting_good_afternoon() : m.home_greeting_good_evening();
    });
    function move(id: string, to: number) {
        const copy = [...widgets];
        const from = copy.findIndex((widget) => widget.id === id);
        if (from < 0 || to < 0 || to >= copy.length || from === to) return;
        const [widget] = copy.splice(from, 1); copy.splice(to, 0, widget);
        layout[mode] = copy;
        announcement = m.home_widget_moved({ name: catalog.find((item) => item.id === id)?.name ?? id, position: to + 1 });
    }
    function add(id: string, width: number) {
        if (!widgets.some((widget) => widget.id === id)) layout[mode] = [...widgets, { id, width }];
        picker = false;
    }
    async function save() {
        saving = true;
        try {
            const { error } = await api.users.me.preferences.patch({ homeLayout: layout });
            if (error) throw error;
            editing = false;
            toasts.success(m.home_layout_saved());
        } catch (error) { toasts.error(errorMessage(error, m.home_layout_failed())); }
        finally { saving = false; }
        if (!editing) await refreshData();
    }
    async function switchMode() {
        const next = mode === 'user' ? 'host' : 'user';
        switching = true;
        try {
            const { error } = await api.users.me.preferences.patch({ homeMode: next });
            if (error) throw error;
        } catch (error) { toasts.error(errorMessage(error, m.home_layout_failed())); switching = false; return; }
        await goto(`/?view=${next}`, { invalidateAll: true });
        switching = false;
    }
    async function pin(groupId: string) {
        if (pinning) return;
        pinning = groupId;
        try {
            const { error } = await api.users.me.preferences.patch({ primaryGroupId: dashboard.primaryGroupId === groupId ? null : groupId });
            if (error) throw error;
        } catch (error) { toasts.error(errorMessage(error, m.home_could_not_change_primary_group())); pinning = null; return; }
        pinning = null;
        await refreshData();
    }
</script>
<div class="mx-auto max-w-7xl px-4 py-8">
    <header class="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div class="min-w-0">
            <div class="flex flex-wrap items-center gap-3">
                <h1 class="text-2xl font-semibold tracking-tight wrap-anywhere">{m.home_greeting({ greeting, name: user.displayName ?? user.username ?? m.home_there() })}</h1>
                <Button size="sm" variant="secondary" loading={switching} disabled={editing} onclick={switchMode} aria-label={mode === 'user' ? m.home_switch_host() : m.home_switch_user()}>{mode === 'user' ? m.home_user_mode() : m.home_host_mode()}</Button>
            </div>
            <p class="mt-2 text-sm text-text-muted">{mode === 'user' ? m.home_user_description() : m.home_host_description()}</p>
        </div>
        <div class="flex flex-wrap gap-2">
            {#if editing}
                <Button size="sm" variant="secondary" onclick={() => { layout[mode] = structuredClone(defaultLayouts[mode]); }}>{m.home_reset_layout()}</Button>
                <Button size="sm" variant="secondary" onclick={() => { layout = structuredClone(user.homeLayout); editing = false; }}>{m.common_cancel()}</Button>
                <Button size="sm" loading={saving} onclick={save}>{m.home_done_editing()}</Button>
            {:else}
                <Button size="sm" variant="secondary" onclick={() => { editing = true; }}><IconAdjustments size={16} />{m.home_customize()}</Button>
            {/if}
        </div>
    </header>
    {#if editing}
        <div class="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-accent/30 bg-accent/5 p-4">
            <p class="min-w-0 text-sm text-text-muted">{m.home_edit_hint()}</p>
            <Button size="sm" onclick={() => { picker = true; }}><IconPlus size={15} />{m.home_add_widget()}</Button>
        </div>
    {/if}
    <p class="sr-only" aria-live="polite">{announcement}</p>
    <div class="grid grid-cols-1 items-start gap-5 md:grid-cols-2 lg:grid-cols-3" data-testid="home-widgets">
        {#each widgets as widget, index (widget.id)}
            {@const entry = catalog.find((item) => item.id === widget.id)}
            {#if entry}
                <section class="min-w-0 {widget.width === 2 ? 'md:col-span-2' : ''} {dragging === widget.id ? 'opacity-50' : ''}" aria-label={entry.name} data-widget={widget.id}>
                    {#if editing}
                        <div class="mb-2 flex flex-wrap items-center gap-1 rounded-lg border border-border-base bg-background-secondary p-2">
                            <button type="button" draggable ondragstart={(event) => { dragging = widget.id; event.dataTransfer?.setData('text/plain', widget.id); }} ondragend={() => { dragging = null; }} class="cursor-grab rounded p-1 text-text-muted" aria-label={m.home_drag_widget({ name: entry.name })}><IconGripVertical size={16} /></button>
                            <button type="button" ondragover={(event) => { event.preventDefault(); }} ondrop={(event) => { event.preventDefault(); if (dragging) move(dragging, index); dragging = null; }} class="min-w-0 flex-1 truncate rounded px-1 text-left text-xs font-medium" title={m.home_drop_here()}>{entry.name}</button>
                            <button type="button" disabled={index === 0} onclick={() => move(widget.id, index - 1)} aria-label={m.home_move_up({ name: entry.name })} class="rounded p-1.5 text-text-muted hover:bg-background-muted disabled:opacity-30"><IconArrowUp size={15} /></button>
                            <button type="button" disabled={index === widgets.length - 1} onclick={() => move(widget.id, index + 1)} aria-label={m.home_move_down({ name: entry.name })} class="rounded p-1.5 text-text-muted hover:bg-background-muted disabled:opacity-30"><IconArrowDown size={15} /></button>
                            <button type="button" onclick={() => { widget.width = widget.width === 1 ? 2 : 1; }} class="rounded px-2 py-1 text-xs text-text-muted hover:bg-background-muted" aria-label={m.home_resize_widget({ name: entry.name })}>{widget.width === 1 ? m.home_make_wide() : m.home_make_compact()}</button>
                            <button type="button" onclick={() => { layout[mode] = widgets.filter((item) => item.id !== widget.id); }} aria-label={m.home_remove_widget({ name: entry.name })} class="rounded p-1.5 text-text-muted hover:bg-danger/10 hover:text-danger"><IconX size={15} /></button>
                        </div>
                    {/if}
                    <HomeWidget id={widget.id} title={entry.name} {dashboard} {user} {pinning} onpin={pin} />
                </section>
            {/if}
        {/each}
    </div>
    {#if widgets.length === 0}
        <div class="rounded-xl border border-dashed border-border-base p-8 text-center"><p class="mb-4 text-text-muted">{m.home_empty_layout()}</p><Button variant="secondary" onclick={() => { editing = true; picker = true; }}>{m.home_add_widget()}</Button></div>
    {/if}
</div>
<Modal bind:open={picker} title={m.home_add_widget()} description={m.home_widget_picker_hint()} size="lg">
    <div class="grid gap-3 sm:grid-cols-2">
        {#each catalog as entry (entry.id)}
            {@const added = widgets.some((widget) => widget.id === entry.id)}
            <button type="button" disabled={added} onclick={() => add(entry.id, entry.width)} class="min-w-0 rounded-xl border border-border-base p-4 text-left transition-colors hover:border-accent/50 hover:bg-accent/5 disabled:opacity-40">
                <span class="flex items-center justify-between gap-2"><span class="font-medium">{entry.name}</span><IconPlus size={16} class="shrink-0 text-accent" /></span>
                <span class="mt-1 block text-sm text-text-muted">{entry.description}</span>
            </button>
        {/each}
    </div>
</Modal>
