<script lang="ts">
	import { refreshData } from '$lib/utils/refresh';
	import {
		IconArrowDown,
		IconArrowUp,
		IconCheckbox,
		IconChevronDown,
		IconPhoto,
		IconPhotoPlus,
		IconPlus,
		IconTextCaption,
		IconTrash,
		IconTypography,
		IconAlignLeft
	} from '@tabler/icons-svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Field from '$lib/components/ui/Field.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import Textarea from '$lib/components/ui/Textarea.svelte';
	import Toggle from '$lib/components/ui/Toggle.svelte';
	import Select from '$lib/components/ui/Select.svelte';
	import EmptyState from '$lib/components/ui/EmptyState.svelte';
	import { API_URL, api, errorMessage } from '$lib/api/client';
	import { toasts } from '$lib/stores/toast.svelte';
	import {
		CHOICE_QUESTION_TYPES,
		questionTypeLabel,
		STATIC_QUESTION_TYPES,
		type ApplicationQuestion,
		type ApplicationQuestionType,
		type QuestionDraft
	} from '$lib/api/types';
	import { m } from '$lib/paraglide/messages.js';

	/**
	 * The form builder.
	 *
	 * The whole form is edited locally and saved in one go, the way the sign-up
	 * slots are: the server matches questions by id to keep answers attached to
	 * what they answered, and saving on every keystroke would rewrite a prompt
	 * letter by letter while somebody was still typing it.
	 */
	interface Props {
		groupId: string;
		applicationId: string;
		questions: ApplicationQuestion[];
	}

	let { groupId, applicationId, questions }: Props = $props();

	let drafts = $state<QuestionDraft[]>([]);
	let dirty = $state(false);
	let busy = $state(false);
	let uploadingIndex = $state<number | null>(null);

	// The server leads until somebody starts editing; an unsaved form is never
	// thrown away by a background refresh.
	$effect(() => {
		const incoming = questions;
		if (dirty) return;

		drafts = incoming.map((question) => ({
			id: question.id,
			type: question.type,
			prompt: question.prompt,
			description: question.description,
			required: question.required,
			options: [...question.options],
			maxLength: question.maxLength,
			mediaId: question.mediaId,
			image: question.image
		}));
	});

	const TYPES: Array<{ type: ApplicationQuestionType; icon: typeof IconTypography }> = [
		{ type: 'SHORT_TEXT', icon: IconTypography },
		{ type: 'LONG_TEXT', icon: IconAlignLeft },
		{ type: 'MULTIPLE_CHOICE', icon: IconChevronDown },
		{ type: 'CHECKBOXES', icon: IconCheckbox },
		{ type: 'SECTION', icon: IconTextCaption },
		{ type: 'IMAGE', icon: IconPhoto }
	];

	let typeOptions = $derived(
		TYPES.map(({ type }) => ({ value: type, label: questionTypeLabel(type) }))
	);

	const isStatic = (type: ApplicationQuestionType) => STATIC_QUESTION_TYPES.includes(type);
	const isChoice = (type: ApplicationQuestionType) => CHOICE_QUESTION_TYPES.includes(type);

	function add(type: ApplicationQuestionType) {
		drafts = [
			...drafts,
			{
				type,
				prompt: '',
				description: '',
				required: false,
				options: isChoice(type) ? ['', ''] : [],
				maxLength: null,
				mediaId: null,
				image: null
			}
		];
		dirty = true;
	}

	function remove(index: number) {
		drafts = drafts.filter((_, position) => position !== index);
		dirty = true;
	}

	function move(index: number, by: number) {
		const target = index + by;
		if (target < 0 || target >= drafts.length) return;

		const next = [...drafts];
		const [moved] = next.splice(index, 1);
		next.splice(target, 0, moved);
		drafts = next;
		dirty = true;
	}

	function changeType(draft: QuestionDraft, type: ApplicationQuestionType) {
		draft.type = type;
		if (isChoice(type) && draft.options.length === 0) draft.options = ['', ''];
		if (isStatic(type)) draft.required = false;
		dirty = true;
	}

	async function uploadImage(index: number, event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		input.value = '';
		if (!file) return;

		const form = new FormData();
		form.set('file', file);
		form.set('groupId', groupId);
		form.set('ownerType', 'APPLICATION');
		form.set('ownerId', applicationId);

		uploadingIndex = index;
		try {
			// Eden does not model multipart, so uploads go through fetch.
			const response = await fetch(`${API_URL}/media`, {
				method: 'POST',
				body: form,
				credentials: 'include'
			});

			if (!response.ok) throw (await response.text().catch(() => '')) || `Upload failed`;

			const item = (await response.json()) as { id: string; url: string };
			drafts[index].mediaId = item.id;
			drafts[index].image = item.url;
			dirty = true;
		} catch (error) {
			toasts.error(errorMessage(error, m.applications_question_editor_could_not_upload_image()));
		} finally {
			uploadingIndex = null;
		}
	}

	async function save() {
		busy = true;
		try {
			const { error } = await api.applications({ applicationId }).questions.put({
				questions: drafts.map((draft) => ({
					...(draft.id ? { id: draft.id } : {}),
					type: draft.type,
					prompt: draft.prompt.trim(),
					description: draft.description,
					required: draft.required,
					options: isChoice(draft.type)
						? draft.options.map((option) => option.trim()).filter(Boolean)
						: [],
					maxLength: draft.maxLength || null,
					mediaId: draft.type === 'IMAGE' ? draft.mediaId : null
				}))
			});
			if (error) throw error;

			dirty = false;
			toasts.success(m.applications_question_editor_form_saved());
			await refreshData();
		} catch (error) {
			toasts.error(errorMessage(error, m.applications_question_editor_could_not_save_form()));
		} finally {
			busy = false;
		}
	}

	function discard() {
		dirty = false;
		drafts = questions.map((question) => ({
			id: question.id,
			type: question.type,
			prompt: question.prompt,
			description: question.description,
			required: question.required,
			options: [...question.options],
			maxLength: question.maxLength,
			mediaId: question.mediaId,
			image: question.image
		}));
	}
</script>

<div class="space-y-4">
	{#if drafts.length === 0}
		<EmptyState
			title={m.applications_question_editor_nothing_form_yet()}
			description={m.applications_question_editor_add_questions_want_applicants_answer_any()}
		>
			{#snippet icon()}<IconTextCaption size={28} stroke={1.5} />{/snippet}
		</EmptyState>
	{:else}
		<ol class="space-y-3">
			{#each drafts as draft, index (index)}
				<li class="card space-y-4 p-4">
					<div class="flex flex-wrap items-center gap-2">
						<span
							class="grid size-7 shrink-0 place-items-center rounded-lg bg-background-muted text-xs font-semibold text-text-muted tabular-nums"
						>
							{index + 1}
						</span>

						<div class="min-w-44 flex-1">
							<Select
								value={draft.type}
								options={typeOptions}
								disabled={busy}
								onchange={(type) => changeType(draft, type as ApplicationQuestionType)}
							/>
						</div>

						<div class="flex items-center gap-1">
							<button
								type="button"
								onclick={() => move(index, -1)}
								disabled={index === 0}
								aria-label={m.applications_question_editor_move_up()}
								class="rounded-lg p-2 text-text-subtle transition-colors hover:text-text disabled:opacity-30"
							>
								<IconArrowUp size={16} />
							</button>
							<button
								type="button"
								onclick={() => move(index, 1)}
								disabled={index === drafts.length - 1}
								aria-label={m.applications_question_editor_move_down()}
								class="rounded-lg p-2 text-text-subtle transition-colors hover:text-text disabled:opacity-30"
							>
								<IconArrowDown size={16} />
							</button>
							<button
								type="button"
								onclick={() => remove(index)}
								aria-label={m.applications_question_editor_remove()}
								class="rounded-lg p-2 text-text-subtle transition-colors hover:text-danger"
							>
								<IconTrash size={16} />
							</button>
						</div>
					</div>

					{#if draft.type === 'IMAGE'}
						<div class="flex flex-wrap items-start gap-4">
							{#if draft.image}
								<img
									src={draft.image}
									alt=""
									class="max-h-32 rounded-lg border border-border-base object-contain"
								/>
							{/if}

							<div class="min-w-48 flex-1 space-y-3">
								<label class="inline-flex">
									<input
										type="file"
										accept="image/png,image/jpeg,image/webp,image/gif"
										class="sr-only"
										onchange={(event) => uploadImage(index, event)}
									/>
									<span
										class="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-border-base
											bg-background-secondary px-3 py-1.5 text-sm text-text transition-colors hover:bg-background-secondary-muted"
									>
										<IconPhotoPlus size={15} />
										{uploadingIndex === index
											? m.applications_question_editor_uploading()
											: draft.image
												? m.applications_question_editor_replace_image()
												: m.applications_question_editor_upload_image()}
									</span>
								</label>

								<Field label={m.applications_question_editor_caption()} hint={m.applications_question_editor_optional_shown_under_picture()}>
									<Input
										bind:value={draft.prompt}
										maxlength={300}
										placeholder={m.applications_question_editor_e_g_evening_service_at_cat()}
										oninput={() => (dirty = true)}
									/>
								</Field>
							</div>
						</div>
					{:else}
						<Field label={draft.type === 'SECTION' ? m.applications_question_editor_heading() : m.applications_question_editor_question()}>
							<Input
								bind:value={draft.prompt}
								maxlength={300}
								placeholder={draft.type === 'SECTION'
									? m.applications_question_editor_e_g_before_start()
									: m.applications_question_editor_e_g_why_do_want_drive()}
								oninput={() => (dirty = true)}
							/>
						</Field>

						<Field
							label={draft.type === 'SECTION' ? m.applications_question_editor_text() : m.applications_question_editor_help_text()}
							hint={draft.type === 'SECTION'
								? m.applications_question_editor_shown_applicants_as_paragraph()
								: m.applications_question_editor_optional_guidance_under_question()}
						>
							<Textarea
								bind:value={draft.description}
								rows={draft.type === 'SECTION' ? 4 : 2}
								maxlength={1000}
								oninput={() => (dirty = true)}
							/>
						</Field>
					{/if}

					{#if isChoice(draft.type)}
						<div>
							<div class="mb-2 flex items-center justify-between">
								<span class="text-xs font-semibold tracking-wide text-text-muted uppercase">
									{m.applications_question_editor_choices()}
								</span>
								<Button
									size="sm"
									variant="ghost"
									onclick={() => {
										draft.options = [...draft.options, ''];
										dirty = true;
									}}
								>
									<IconPlus size={15} /> {m.applications_question_editor_add_choice()}
								</Button>
							</div>

							{#if draft.options.filter((option) => option.trim()).length === 0}
								<p class="mb-2 text-xs text-warning">
									{m.applications_question_editor_question_with_no_choices_cannot_answered()}
								</p>
							{/if}

							<ul class="space-y-2">
								{#each draft.options as _, optionIndex (optionIndex)}
									<li class="flex items-center gap-2">
										<span class="text-xs text-text-subtle tabular-nums">{optionIndex + 1}</span>
										<Input
											bind:value={draft.options[optionIndex]}
											maxlength={120}
											placeholder={m.applications_question_editor_e_g_weekends_only()}
											oninput={() => (dirty = true)}
										/>
										<button
											type="button"
											aria-label={m.applications_question_editor_remove_choice()}
											onclick={() => {
												draft.options = draft.options.filter((_, at) => at !== optionIndex);
												dirty = true;
											}}
											class="rounded-lg p-2 text-text-subtle transition-colors hover:text-danger"
										>
											<IconTrash size={15} />
										</button>
									</li>
								{/each}
							</ul>
						</div>
					{/if}

					{#if !isStatic(draft.type)}
						<div class="grid gap-4 sm:grid-cols-2">
							<Toggle
								checked={draft.required}
								label={m.applications_question_editor_required()}
								description={m.applications_question_editor_applicant_cannot_send_form_without_answering()}
								onchange={(required) => {
									draft.required = required;
									dirty = true;
								}}
							/>

							{#if draft.type === 'SHORT_TEXT' || draft.type === 'LONG_TEXT'}
								<Field label={m.applications_question_editor_length_limit()} hint={m.applications_question_editor_characters_leave_empty_no_limit()}>
									<Input
										type="number"
										min="1"
										max="5000"
										value={draft.maxLength ?? ''}
										placeholder={m.applications_question_editor_no_limit()}
										oninput={(event) => {
											const raw = (event.currentTarget as HTMLInputElement).value;
											draft.maxLength = raw ? Number(raw) : null;
											dirty = true;
										}}
									/>
								</Field>
							{/if}
						</div>
					{/if}
				</li>
			{/each}
		</ol>
	{/if}

	<div class="card p-4">
		<p class="mb-3 text-xs font-semibold tracking-wide text-text-muted uppercase">{m.applications_question_editor_add_component()}</p>
		<div class="flex flex-wrap gap-2">
			{#each TYPES as option (option.type)}
				<button
					type="button"
					onclick={() => add(option.type)}
					class="inline-flex items-center gap-1.5 rounded-lg border border-border-base px-3 py-2 text-sm
						text-text-muted transition-colors hover:border-accent/50 hover:text-text"
				>
					<option.icon size={16} />
					{questionTypeLabel(option.type)}
				</button>
			{/each}
		</div>
	</div>

	{#if dirty}
		<!--
			The bar sticks to the bottom of the viewport: a long form pushes the
			save button off screen exactly when there is most to lose.
		-->
		<div
			class="sticky bottom-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-accent/40
				bg-surface/95 px-4 py-3 shadow-lg backdrop-blur"
		>
			<p class="text-sm text-text-muted">{m.applications_question_editor_have_unsaved_changes_form()}</p>
			<div class="flex gap-2">
				<Button size="sm" variant="ghost" onclick={discard} disabled={busy}>{m.applications_question_editor_discard()}</Button>
				<Button size="sm" loading={busy} onclick={save}>{m.applications_question_editor_save_form()}</Button>
			</div>
		</div>
	{/if}
</div>
