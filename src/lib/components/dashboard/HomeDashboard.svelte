<script lang="ts">
    import { onMount, tick } from 'svelte';
    import { beforeNavigate, goto } from '$app/navigation';
    import { IconArrowDown, IconArrowUp, IconGripVertical, IconPlus, IconX, IconAdjustments, IconSwitchHorizontal, IconCheck, IconSearch, IconColumns2, IconRectangle } from '@tabler/icons-svelte';
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
    let ready = $state(false);
    onMount(() => { ready = true; return stopDrag; });
    let mode = $derived(dashboard.mode);
    let catalog = $derived(widgetCatalog(mode));
    let draft = $state<HomeLayout | null>(null);
    let editing = $derived(draft !== null);
    let widgets = $derived(draft ? draft[mode] : user.homeLayout[mode]);
    let dirty = $derived(draft !== null && JSON.stringify(draft) !== JSON.stringify(user.homeLayout));
    let picker = $state(false);
    let search = $state('');
    let searchInput = $state<HTMLInputElement | null>(null);
    let choices = $derived(catalog.filter(item => (item.name + ' ' + item.description).toLocaleLowerCase().includes(search.trim().toLocaleLowerCase())));
    let saving = $state(false);
    let saveError = $state('');
    let switching = $state(false);
    let dragging = $state<string | null>(null);
    let dropTarget = $state<string | null>(null);
    let touch: { id: string; pointerId: number; x: number; y: number } | null = null;
    let scrollFrame: number | null = null;
    let scrollSpeed = 0;
    let pointer = { x: 0, y: 0 };
    function targetAtPointer() { dropTarget = document.elementFromPoint(pointer.x, pointer.y)?.closest<HTMLElement>('[data-widget]')?.dataset.widget ?? null; }
    function scrollWhileDragging() {
        scrollFrame = null;
        if (!dragging || !scrollSpeed) return;
        window.scrollBy(0, scrollSpeed); targetAtPointer();
        scrollFrame = requestAnimationFrame(scrollWhileDragging);
    }
    let announcement = $state('');
    let pinning = $state<string | null>(null);
    let greeting = $derived.by(() => {
        const hour = new Date().getHours();
        return hour < 5 ? m.home_greeting_still_up() : hour < 12 ? m.home_greeting_good_morning() : hour < 18 ? m.home_greeting_good_afternoon() : m.home_greeting_good_evening();
    });
    beforeNavigate(navigation => {
        if (saving) { navigation.cancel(); return; }
        if (!dirty) return;
        if (navigation.willUnload || !window.confirm(m.home_discard_changes())) navigation.cancel();
        else { draft = null; picker = false; }
    });
    $effect(() => { if (picker) void tick().then(() => searchInput?.focus()); });
    function beginEdit() { draft = structuredClone($state.snapshot(user.homeLayout)); saveError = ''; }
    function cancel() { if (!saving) { draft = null; picker = false; stopDrag(); saveError = ''; } }
    function move(id: string, to: number) {
        if (!draft || saving) return;
        const copy = [...widgets], from = copy.findIndex(widget => widget.id === id);
        if (from < 0 || to < 0 || to >= copy.length || from === to) return;
        const focus = document.activeElement as HTMLElement | null;
        const [widget] = copy.splice(from, 1); copy.splice(to, 0, widget);
        draft[mode] = copy;
        announcement = m.home_widget_moved({ name: catalog.find(item => item.id === id)?.name ?? id, position: to + 1 });
        void tick().then(() => {
            const target = focus?.matches(':disabled') ? document.querySelector<HTMLElement>(`[data-widget="${id}"] [data-drag-handle]`) : focus;
            target?.focus({ preventScroll: true });
        });
    }
    function add(id: string, width: number) {
        if (!draft || saving || widgets.some(widget => widget.id === id)) return;
        draft[mode] = [...widgets, { id, width }];
        announcement = m.home_added_widget({ name: catalog.find(item => item.id === id)!.name });
        void tick().then(() => searchInput?.focus());
    }
    function remove(id: string) {
        if (!draft || saving) return;
        const index = widgets.findIndex(widget => widget.id === id);
        draft[mode] = widgets.filter(widget => widget.id !== id);
        announcement = m.home_removed_widget({ name: catalog.find(item => item.id === id)!.name });
        void tick().then(() => {
            const next = widgets[Math.min(index, widgets.length - 1)];
            if (next) document.querySelector<HTMLElement>(`[data-widget="${next.id}"] [data-drag-handle]`)?.focus({ preventScroll: true });
        });
    }
    function stopDrag() { if (scrollFrame !== null) cancelAnimationFrame(scrollFrame); scrollFrame = null; scrollSpeed = 0; dragging = null; dropTarget = null; touch = null; }
    function touchMove(event: PointerEvent) {
        if (!touch || event.pointerId !== touch.pointerId || saving) return;
        if (!dragging && Math.hypot(event.clientX - touch.x, event.clientY - touch.y) < 8) return;
        dragging = touch.id;
        pointer = { x: event.clientX, y: event.clientY }; targetAtPointer();
        const toolbarBottom = document.querySelector('[data-testid="widget-editor"]')?.getBoundingClientRect().bottom ?? 80;
        scrollSpeed = event.clientY < Math.min(toolbarBottom + 30, window.innerHeight / 2) ? -12 : event.clientY > window.innerHeight - 70 ? 12 : 0;
        if (scrollSpeed && scrollFrame === null) scrollFrame = requestAnimationFrame(scrollWhileDragging);
    }
    function touchEnd(event: PointerEvent) {
        if (!touch || event.pointerId !== touch.pointerId) return;
        if (dragging && dropTarget) move(dragging, widgets.findIndex(widget => widget.id === dropTarget));
        stopDrag();
    }
    async function save() {
        if (!draft || saving || !dirty) return;
        saving = true; saveError = '';
        try {
            const { error } = await api.users.me.preferences.patch({ homeLayout: $state.snapshot(draft) });
            if (error) throw error;
            // Keep the preview visible until the refreshed session carries the
            // saved layout, so it never flashes back to the previous order.
            await refreshData();
            draft = null;
            toasts.success(m.home_layout_saved());
        } catch (error) { saveError = errorMessage(error, m.home_layout_failed()); }
        finally { saving = false; }
    }
    async function switchMode() {
        if (editing || switching) return;
        const next = mode === 'user' ? 'host' : 'user';
        switching = true;
        try {
            const { error } = await api.users.me.preferences.patch({ homeMode: next });
            if (error) throw error;
            await goto(`/?view=${next}`, { invalidateAll: true });
        } catch (error) { toasts.error(errorMessage(error, m.home_layout_failed())); }
        finally { switching = false; }
    }
    async function pin(groupId: string) {
        if (pinning) return;
        pinning = groupId;
        try {
            const { error } = await api.users.me.preferences.patch({ primaryGroupId: dashboard.primaryGroupId === groupId ? null : groupId });
            if (error) throw error;
            await refreshData();
        } catch (error) { toasts.error(errorMessage(error, m.home_could_not_change_primary_group())); }
        finally { pinning = null; }
    }
</script>
<svelte:window onpointermove={touchMove} onpointerup={touchEnd} onpointercancel={stopDrag} />
<div class="mx-auto max-w-7xl px-4 py-8">
    <header class="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div class="min-w-0">
            <div class="flex flex-wrap items-center gap-x-4 gap-y-2">
                <h1 class="text-2xl font-semibold tracking-tight wrap-anywhere">{m.home_greeting({ greeting, name: user.displayName ?? user.username ?? m.home_there() })}</h1>
                <Button size="sm" variant="ghost" loading={switching} disabled={!ready || editing} onclick={switchMode} aria-label={mode === 'user' ? m.home_switch_host() : m.home_switch_user()} title={mode === 'user' ? m.home_switch_host() : m.home_switch_user()}>
                    <IconSwitchHorizontal size={16} />{mode === 'user' ? m.home_host_mode() : m.home_user_mode()}
                </Button>
            </div>
            <p class="mt-2 text-sm text-text-muted">{mode === 'user' ? m.home_user_description() : m.home_host_description()}</p>
        </div>
        {#if !editing}<Button size="sm" variant="secondary" disabled={!ready || switching} onclick={beginEdit}><IconAdjustments size={16} />{m.home_customize()}</Button>{/if}
    </header>
    {#if editing}
        <div class="sticky top-14 z-20 mb-5 rounded-xl border border-accent/30 bg-surface p-4 shadow-sm" data-testid="widget-editor">
            <div class="flex flex-wrap items-center justify-between gap-3">
                <div class="flex flex-wrap gap-2">
                    <Button size="sm" disabled={saving} onclick={() => { search = ''; picker = true; }}><IconPlus size={16} />{m.home_add_widget()}</Button>
                    <Button size="sm" variant="ghost" disabled={saving} onclick={() => { if (draft) draft[mode] = structuredClone(defaultLayouts[mode]); }}>{m.home_reset_layout()}</Button>
                </div>
                <div class="flex flex-wrap items-center gap-2">
                    {#if dirty}<span class="text-xs text-text-subtle">{m.home_unsaved_changes()}</span>{/if}
                    <Button size="sm" variant="secondary" disabled={saving} onclick={cancel}>{m.common_cancel()}</Button>
                    <Button size="sm" loading={saving} disabled={!dirty} onclick={save}><IconCheck size={16} />{m.home_done_editing()}</Button>
                </div>
            </div>
            <p class="mt-3 text-xs leading-relaxed text-text-muted">{m.home_edit_hint()} <span class="md:hidden">{m.home_size_hint()}</span></p>
            {#if saveError}<p class="mt-3 text-sm text-danger" role="alert">{saveError}</p>{/if}
        </div>
    {/if}
    <p class="sr-only" aria-live="polite">{announcement}</p>
    <div class="grid grid-cols-1 items-start gap-5 md:grid-cols-2 lg:grid-cols-3" data-testid="home-widgets">
        {#each widgets as widget, index (widget.id)}
            {@const entry = catalog.find(item => item.id === widget.id)}
            {#if entry}
                <section class="@container min-w-0 {widget.width === 2 ? 'md:col-span-2' : ''} {dragging === widget.id ? 'opacity-50' : ''} {dropTarget === widget.id && dragging !== widget.id ? 'rounded-xl ring-2 ring-accent ring-offset-4 ring-offset-background' : ''}"
                    aria-label={entry.name} data-widget={widget.id} data-width={widget.width}>
                    {#if editing}
                        <fieldset disabled={saving} class="mb-2 min-w-0 rounded-xl border border-border-base bg-background-secondary p-2">
                            <div class="flex items-center gap-2">
                                <button type="button" data-drag-handle
                                    onpointerdown={event => { if (event.button !== 0 || saving) return; event.preventDefault(); event.currentTarget.focus(); event.currentTarget.setPointerCapture(event.pointerId); touch = { id: widget.id, pointerId: event.pointerId, x: event.clientX, y: event.clientY }; }}
                                    class="grid size-10 shrink-0 cursor-grab touch-none place-items-center rounded-lg text-text-muted hover:bg-background-muted active:cursor-grabbing focus-visible:outline-2 focus-visible:outline-accent"
                                    aria-label={m.home_drag_widget({ name: entry.name })}><IconGripVertical size={19} class="pointer-events-none" /></button>
                                <p class="min-w-0 flex-1 text-sm font-medium wrap-anywhere">{entry.name}</p>
                                <button type="button" onclick={() => remove(widget.id)} aria-label={m.home_remove_widget({ name: entry.name })} class="grid size-10 shrink-0 place-items-center rounded-lg text-text-muted hover:bg-danger/10 hover:text-danger"><IconX size={17} /></button>
                            </div>
                            <div class="mt-1 flex flex-wrap items-center justify-between gap-2 border-t border-border-base pt-2">
                                <div class="flex items-center gap-1">
                                    <select value={index} onchange={event => move(widget.id, Number(event.currentTarget.value))} aria-label={m.home_position_label({ name: entry.name })} class="h-10 max-w-32 rounded-lg border border-border-base bg-surface px-2 text-xs text-text">
                                        {#each widgets as _, position}<option value={position}>{m.home_widget_position({ position: position + 1 })}</option>{/each}
                                    </select>
                                    <button type="button" disabled={index === 0} onclick={() => move(widget.id, index - 1)} aria-label={m.home_move_up({ name: entry.name })} class="grid size-10 place-items-center rounded-lg text-text-muted hover:bg-background-muted disabled:opacity-30"><IconArrowUp size={17} /></button>
                                    <button type="button" disabled={index === widgets.length - 1} onclick={() => move(widget.id, index + 1)} aria-label={m.home_move_down({ name: entry.name })} class="grid size-10 place-items-center rounded-lg text-text-muted hover:bg-background-muted disabled:opacity-30"><IconArrowDown size={17} /></button>
                                </div>
                                <button type="button" onclick={() => { if (!saving) widget.width = widget.width === 1 ? 2 : 1; }} class="flex h-10 items-center gap-1.5 rounded-lg px-2 text-xs text-text-muted hover:bg-background-muted" aria-label={m.home_resize_widget({ name: entry.name })} aria-pressed={widget.width === 2}>
                                    {#if widget.width === 1}<IconRectangle size={16} />{m.home_make_wide()}{:else}<IconColumns2 size={16} />{m.home_make_compact()}{/if}
                                </button>
                            </div>
                        </fieldset>
                    {/if}
                    <div inert={editing} class={editing ? 'select-none opacity-75' : ''}><HomeWidget id={widget.id} title={entry.name} icon={entry.icon} {dashboard} {user} {pinning} onpin={pin} /></div>
                </section>
            {/if}
        {/each}
    </div>
    {#if widgets.length === 0}
        <div class="rounded-xl border border-dashed border-border-base p-8 text-center"><p class="mb-4 text-text-muted">{m.home_empty_layout()}</p><Button variant="secondary" disabled={!ready || saving} onclick={() => { if (!editing) beginEdit(); search = ''; picker = true; }}>{m.home_add_widget()}</Button></div>
    {/if}
</div>
<Modal bind:open={picker} title={m.home_add_widget()} description={m.home_widget_picker_hint()} size="lg">
    <label class="mb-4 flex items-center gap-2 rounded-lg border border-border-base bg-background-secondary px-3 text-text-muted"><IconSearch size={17} /><input bind:this={searchInput} bind:value={search} placeholder={m.home_widget_search()} aria-label={m.home_widget_search()} class="h-11 min-w-0 flex-1 bg-transparent text-sm text-text outline-none" /></label>
    <div class="grid gap-3 sm:grid-cols-2">
        {#each choices as entry (entry.id)}
            {@const added = widgets.some(widget => widget.id === entry.id)}
            <button type="button" disabled={added || saving} onclick={() => add(entry.id, entry.width)} class="min-w-0 rounded-xl border border-border-base p-4 text-left transition-colors hover:border-accent/50 hover:bg-accent/5 disabled:opacity-50">
                <span class="flex items-center gap-3"><entry.icon size={20} class="shrink-0 text-accent" /><span class="min-w-0 flex-1 font-medium">{entry.name}</span>{#if added}<IconCheck size={16} /><span class="text-xs text-text-muted">{m.home_widget_added()}</span>{:else}<IconPlus size={16} class="shrink-0 text-accent" />{/if}</span>
                <span class="mt-2 block text-sm leading-relaxed text-text-muted">{entry.description}</span>
            </button>
        {/each}
        {#if choices.length === 0}<p class="py-5 text-sm text-text-muted sm:col-span-2">{m.home_widget_search_empty()}</p>{/if}
    </div>
    {#snippet footer()}<Button variant="secondary" onclick={() => { picker = false; }}>{m.home_picker_done()}</Button>{/snippet}
</Modal>
