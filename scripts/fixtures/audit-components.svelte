<script lang="ts">
    import { onMount } from 'svelte';
    import Field from '$lib/components/ui/Field.svelte';
    import Input from '$lib/components/ui/Input.svelte';
    import Textarea from '$lib/components/ui/Textarea.svelte';
    import Select from '$lib/components/ui/Select.svelte';
    import CustomSelect from '$lib/components/ui/CustomSelect.svelte';
    import ImageGallery from '$lib/components/media/ImageGallery.svelte';
    import { OwnerDirectory } from '$lib/stores/owners.svelte';
    import type { MediaItem } from '$lib/api/types';
    const directory = new OwnerDirectory();
    let choice = $state('a');
    let hydrated = $state(false);
    onMount(() => { hydrated = true; });
    const images = [{ id: 'audit', url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l9sAAAAASUVORK5CYII=', caption: 'Audit image', translations: {} }] as MediaItem[];
</script>
<div data-audit-hydrated={hydrated} class="mx-auto max-w-xl space-y-4 p-4">
    <Field label="Audit driver" hint="Driver help"><Input /></Field>
    <Field label="Audit note" error="Note error"><Textarea /></Field>
    <Field label="Audit depot"><Select options={[{ value: 'a', label: 'Main Island' }]} /></Field>
    <Field label="Audit route"><CustomSelect bind:value={choice} options={[{ value: 'a', label: 'Route A' }, { value: 'b', label: 'Route B' }]} /></Field>
    <ImageGallery {images} layout="grid" />
    <button onclick={() => directory.resolve(Array.from({ length: 500 }, (_, index) => String(index + 1)))}>Resolve drivers</button>
    <output aria-label="Profile count">{Object.keys(directory.profiles).length}</output>
</div>
