<script lang="ts">
	import { onDestroy } from 'svelte';
	import {
		IconClipboardText,
		IconDownload,
		IconFileMusic,
		IconPlayerPause,
		IconPlayerPlay,
		IconPlus,
		IconTrash,
		IconZoomIn
	} from '@tabler/icons-svelte';
	import PageHeader from '$lib/components/ui/PageHeader.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import Modal from '$lib/components/ui/Modal.svelte';
	import Field from '$lib/components/ui/Field.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import Textarea from '$lib/components/ui/Textarea.svelte';
	import EmptyState from '$lib/components/ui/EmptyState.svelte';
	import MarkerDialog from '$lib/components/stage/MarkerDialog.svelte';
	import { toasts } from '$lib/stores/toast.svelte';
	import {
		MARKER_COLORS,
		describeEntry,
		formatTimecode,
		kindForCommand,
		parseProgram,
		serialiseProgram,
		type Program,
		type ProgramEntry
	} from '$lib/components/stage/program';
	import { m } from '$lib/paraglide/messages.js';

	let program = $state<Program>([]);
	let duration = $state(0);
	let currentTime = $state(0);
	let playing = $state(false);
	let ready = $state(false);
	let zoom = $state(0);
	let trackName = $state('');

	let waveformEl = $state<HTMLDivElement | null>(null);
	let fileInput = $state<HTMLInputElement | null>(null);

	// wavesurfer is browser-only and heavy, so it is imported on demand.
	let wavesurfer: import('wavesurfer.js').default | null = null;
	let objectUrl: string | null = null;

	let markerDialogOpen = $state(false);
	let markerTime = $state(0);

	let importOpen = $state(false);
	let importText = $state('');

	let soundOpen = $state(false);
	let soundId = $state('');
	let loadingSound = $state(false);

	let sorted = $derived([...program].sort((a, b) => a[0] - b[0]));

	async function mount(url: string, name: string) {
		const { default: WaveSurfer } = await import('wavesurfer.js');

		wavesurfer?.destroy();
		ready = false;
		playing = false;

		if (!waveformEl) return;

		wavesurfer = WaveSurfer.create({
			container: waveformEl,
			height: 128,
			waveColor: '#5b9dff66',
			progressColor: '#5b9dff',
			cursorColor: '#ededed',
			cursorWidth: 2,
			dragToSeek: true,
			normalize: true,
			url
		});

		wavesurfer.on('ready', () => {
			ready = true;
			duration = wavesurfer?.getDuration() ?? 0;
			trackName = name;
		});

		wavesurfer.on('timeupdate', (time: number) => (currentTime = time));
		wavesurfer.on('play', () => (playing = true));
		wavesurfer.on('pause', () => (playing = false));
		wavesurfer.on('finish', () => (playing = false));

		wavesurfer.on('error', () => {
			toasts.error(m.tools_stage_audio_could_not_decoded());
			ready = false;
		});
	}

	function revokeUrl() {
		if (objectUrl) {
			URL.revokeObjectURL(objectUrl);
			objectUrl = null;
		}
	}

	async function onFile(event: Event) {
		const file = (event.currentTarget as HTMLInputElement).files?.[0];
		if (!file) return;

		revokeUrl();
		objectUrl = URL.createObjectURL(file);
		await mount(objectUrl, file.name);
	}

	/**
	 * Roblox asset audio is not fetchable cross-origin from a browser, so the
	 * id is only used to label the program. The audio itself has to come from a
	 * local file.
	 */
	function useSoundId() {
		if (!/^\d+$/.test(soundId.trim())) {
			toasts.error(m.tools_stage_sound_id_numbers_only());
			return;
		}

		trackName = `Roblox sound ${soundId.trim()}`;
		soundOpen = false;
		toasts.info(m.tools_stage_sound_id_saved_load_audio_file());
	}

	function togglePlay() {
		if (!wavesurfer || !ready) return;
		wavesurfer.playPause();
	}

	function applyZoom(value: number) {
		zoom = value;
		if (wavesurfer && ready) wavesurfer.zoom(value);
	}

	function seekTo(seconds: number) {
		if (!wavesurfer || !ready || duration === 0) return;
		wavesurfer.seekTo(Math.min(1, Math.max(0, seconds / duration)));
	}

	function addMarkerHere() {
		markerTime = ready ? currentTime : 0;
		markerDialogOpen = true;
	}

	function onWaveformContext(event: MouseEvent) {
		if (!ready || !waveformEl) return;

		event.preventDefault();
		const bounds = waveformEl.getBoundingClientRect();
		const ratio = (event.clientX - bounds.left) / bounds.width;

		markerTime = Math.max(0, Math.min(duration, ratio * duration));
		markerDialogOpen = true;
	}

	function addEntry(entry: ProgramEntry) {
		program = [...program, entry].sort((a, b) => a[0] - b[0]);
	}

	function removeEntry(index: number) {
		program = sorted.filter((_, position) => position !== index);
	}

	function doImport() {
		const result = parseProgram(importText);

		if ('error' in result) {
			toasts.error(result.error);
			return;
		}

		program = result.program;
		importOpen = false;
		importText = '';
		toasts.success(m.tools_stage_imported_markers({ count: result.program.length }));
	}

	async function exportProgram() {
		const payload = serialiseProgram(program);

		try {
			await navigator.clipboard.writeText(payload);
			toasts.success(m.tools_stage_program_copied_clipboard());
		} catch {
			// Clipboard access can be denied; the textarea below is the fallback.
			toasts.info(m.tools_stage_copy_program_from_box_below());
		}

		exportText = payload;
		exportOpen = true;
	}

	let exportOpen = $state(false);
	let exportText = $state('');

	onDestroy(() => {
		wavesurfer?.destroy();
		revokeUrl();
	});
</script>

<svelte:head>
	<title>{m.tools_stage_stage_programmer_trp_tools()}</title>
	<meta name="description" content="Build stage lighting programs against a waveform." />
</svelte:head>

<div class="mx-auto max-w-6xl px-4 py-10">
	<PageHeader
		title={m.common_stage_programmer()}
		description={m.tools_stage_load_track_drop_light_cues_against()}
	>
		{#snippet actions()}
			<Button variant="secondary" onclick={() => (importOpen = true)}>
				<IconClipboardText size={16} /> {m.common_import()}
			</Button>
			<Button onclick={exportProgram} disabled={program.length === 0}>
				<IconDownload size={16} /> {m.tools_stage_export()}
			</Button>
		{/snippet}
	</PageHeader>

	<!-- Transport -->
	<div class="card mb-4 p-4">
		<div class="flex flex-wrap items-center gap-3">
			<input
				bind:this={fileInput}
				type="file"
				accept="audio/*"
				class="hidden"
				onchange={onFile}
			/>

			<Button variant="secondary" onclick={() => fileInput?.click()}>
				<IconFileMusic size={16} /> {m.tools_stage_load_audio()}
			</Button>

			<Button variant="ghost" onclick={() => (soundOpen = true)}>{m.tools_stage_roblox_sound_id()}</Button>

			<Button onclick={togglePlay} disabled={!ready}>
				{#if playing}
					<IconPlayerPause size={16} /> Pause
				{:else}
					<IconPlayerPlay size={16} /> Play
				{/if}
			</Button>

			<Button variant="secondary" onclick={addMarkerHere}>
				<IconPlus size={16} /> {m.tools_stage_marker_at_playhead()}
			</Button>

			<div class="ml-auto flex items-center gap-3">
				{#if trackName}
					<Badge>{trackName}</Badge>
				{/if}
				<span class="font-mono text-sm text-text-muted tabular-nums">
					{formatTimecode(currentTime)} / {formatTimecode(duration)}
				</span>
			</div>
		</div>

		{#if ready}
			<div class="mt-3 flex items-center gap-2">
				<IconZoomIn size={15} class="text-text-subtle" />
				<input
					type="range"
					min="0"
					max="200"
					value={zoom}
					aria-label={m.tools_stage_zoom()}
					oninput={(event) => applyZoom(Number(event.currentTarget.value))}
					class="h-1 flex-1 cursor-pointer appearance-none rounded-full bg-background-muted accent-accent"
				/>
			</div>
		{/if}
	</div>

	<!-- Waveform -->
	<div class="card mb-4 overflow-hidden">
		<div
			bind:this={waveformEl}
			role="application"
			aria-label={m.tools_stage_audio_waveform_right_click_add_marker()}
			oncontextmenu={onWaveformContext}
			class="min-h-32 w-full overflow-x-auto"
		></div>

		{#if !ready}
			<div class="px-5 py-10 text-center">
				<p class="text-sm text-text-muted">
					{m.tools_stage_load_audio_file_see_its_waveform()}
				</p>
			</div>
		{/if}
	</div>

	<!-- Marker list -->
	<section>
		<div class="mb-3 flex items-baseline justify-between">
			<h2 class="text-sm font-semibold tracking-wide text-text-muted uppercase">
				{m.tools_stage_program()}
				<span class="ml-1 font-normal text-text-subtle">{program.length} markers</span>
			</h2>
			{#if program.length > 0}
				<button
					type="button"
					onclick={() => {
						if (confirm(m.tools_stage_clear_every_marker_confirm())) program = [];
					}}
					class="text-xs text-text-subtle transition-colors hover:text-danger"
				>
					{m.tools_stage_clear_all()}
				</button>
			{/if}
		</div>

		{#if program.length === 0}
			<EmptyState
				title={m.tools_stage_no_markers_yet()}
				description={m.tools_stage_add_cues_at_playhead_right_click()}
			/>
		{:else}
			<ul class="card divide-y divide-border-base">
				{#each sorted as entry, index (index + ':' + entry[0] + entry[1])}
					{@const kind = kindForCommand(entry[1])}
					<li class="flex items-center gap-3 px-4 py-2.5">
						<span
							class="size-2.5 shrink-0 rounded-full"
							style="background: {MARKER_COLORS[kind]}"
							title={kind}
						></span>

						<button
							type="button"
							onclick={() => seekTo(entry[0])}
							class="w-16 shrink-0 text-left font-mono text-sm text-accent tabular-nums hover:underline"
						>
							{formatTimecode(entry[0])}
						</button>

						<span class="min-w-0 flex-1 truncate text-sm text-text">{describeEntry(entry)}</span>

						<button
							type="button"
							onclick={() => removeEntry(index)}
							aria-label={m.tools_stage_remove_marker()}
							class="shrink-0 rounded p-1 text-text-subtle transition-colors hover:text-danger"
						>
							<IconTrash size={15} />
						</button>
					</li>
				{/each}
			</ul>
		{/if}
	</section>
</div>

<MarkerDialog
	bind:open={markerDialogOpen}
	time={markerTime}
	onadd={addEntry}
	onclose={() => {}}
/>

<Modal bind:open={importOpen} title={m.tools_stage_import_program()} description={m.tools_stage_paste_previously_exported_program()}>
	<Field label={m.tools_stage_program_json()}>
		<Textarea
			bind:value={importText}
			rows={10}
			spellcheck="false"
			class="font-mono text-xs"
			placeholder={'[[12.5,"Enable",["Default"]],[18,"Big flash"]]'}
		/>
	</Field>

	{#snippet footer()}
		<Button variant="secondary" onclick={() => (importOpen = false)}>{m.common_cancel()}</Button>
		<Button onclick={doImport} disabled={!importText.trim()}>{m.common_import()}</Button>
	{/snippet}
</Modal>

<Modal bind:open={exportOpen} title={m.tools_stage_export()} description={m.tools_stage_copied_clipboard_shown_here_as_fallback()}>
	<Field label={m.tools_stage_program_json()}>
		<Textarea value={exportText} rows={10} readonly spellcheck="false" class="font-mono text-xs" />
	</Field>
</Modal>

<Modal bind:open={soundOpen} title={m.tools_stage_roblox_sound_id()} description={m.tools_stage_labels_program_with_sound_targets()}>
	<Field
		label={m.tools_stage_sound_id()}
		hint={m.tools_stage_browsers_cannot_fetch_roblox_audio_directly()}
	>
		<Input bind:value={soundId} placeholder={m.tools_stage_e_g_1837879082()} spellcheck="false" />
	</Field>

	{#snippet footer()}
		<Button variant="secondary" onclick={() => (soundOpen = false)}>{m.common_cancel()}</Button>
		<Button onclick={useSoundId} loading={loadingSound}>{m.common_save()}</Button>
	{/snippet}
</Modal>
