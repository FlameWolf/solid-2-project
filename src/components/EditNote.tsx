import { createSignal, createMemo, createEffect, onSettled, Show } from "solid-js";
import { useNavigate, useLocation, useParams, useBeforeLeave } from "@solidjs/router";
import { emptyString } from "@/constants/common";
import { areArraysEqual, areSetsEqual, invoke } from "@/utils/common";
import { getSentenceCount, getWordCount, getCharacterCount } from "@/utils/text-analysis";
import { debounce } from "@/utils/timing";
import { create } from "@/models/Note";
import * as notesStore from "@/stores/notes";
import * as appStore from "@/stores/app";
import { addNotification } from "@/stores/notifications";
import { listViewRoutes } from "@/router";
import { confirm } from "@/composables/useConfirmDialogue";
import { useDropdown } from "@/composables/useDropdown";
import { exportNote } from "@/composables/useFileIO";
import { clearDraft, loadDraft, saveDraft } from "@/composables/useNoteDraft";
import { requestSync } from "@/composables/useNotesSync";
import { useTruncate } from "@/composables/useTruncate";
import { useUndoRedo } from "@/composables/useUndoRedo";
import Icon from "@/components/Icon";
import DisplayColourList from "@/components/DisplayColourList";
import Spinner from "@/components/Spinner";
import DisplayTagList from "@/components/DisplayTagList";
import type { UUID } from "crypto";

interface Props {
	backRoute?: string;
}

export default function EditNote(props: Props) {
	let editTextArea!: HTMLTextAreaElement;
	let bypassGuard = false;
	const location = useLocation();
	const params = useParams<{ id?: UUID }>();
	const navigate = useNavigate();
	const isCreateMode = createMemo(() => location.pathname === "/notes/new");
	const existingNote = createMemo(() => (params.id && !isCreateMode() ? notesStore.getNote(params.id) : undefined));
	const [isEditing, setIsEditing] = createSignal(isCreateMode());
	const [editTitle, setEditTitle] = createSignal(existingNote()?.title ?? emptyString);
	const [editContent, setEditContent] = createSignal(emptyString);
	const [editColour, setEditColour] = createSignal<Colour | undefined>();
	const [editTags, setEditTags] = createSignal<string[] | undefined>();
	const [loadedContent, setLoadedContent] = createSignal(emptyString);
	const [isContentLoaded, setIsContentLoaded] = createSignal(false);
	const [dropdownToggle, setDropdownToggle] = createSignal<HTMLElement>();
	const dropdown = useDropdown(dropdownToggle);
	const titleInputRef = useTruncate(editTitle, setEditTitle, 1024);
	const undoRedo = useUndoRedo<string>(editContent());
	const sentenceCount = createMemo(() => (isEditing() ? getSentenceCount(editContent()) : (existingNote()?.sentenceCount ?? 0)), { sync: true });
	const wordCount = createMemo(() => (isEditing() ? getWordCount(editContent()) : (existingNote()?.wordCount ?? 0)), { sync: true });
	const characterCount = createMemo(() => (isEditing() ? getCharacterCount(editContent()) : (existingNote()?.characterCount ?? 0)), { sync: true });
	const hasContent = createMemo(() => !!sentenceCount() || !!wordCount() || !!characterCount(), { sync: true });
	const isFaved = createMemo(() => !!existingNote()?.favedAt && !existingNote()?.deletedAt, { sync: true });
	const isPinned = createMemo(() => !!existingNote()?.pinnedAt && !existingNote()?.deletedAt, { sync: true });
	const isArchived = createMemo(() => !!existingNote()?.archivedAt && !existingNote()?.deletedAt, { sync: true });
	const isTrashed = createMemo(() => !!existingNote()?.deletedAt, { sync: true });
	const backRoute = createMemo(() => props.backRoute ?? "/notes", { sync: true });
	const hasUnsavedChanges = createMemo(
		() => {
			if (!isEditing()) {
				return false;
			}
			if (isCreateMode()) {
				return editTitle().trim().length > 0 || editContent().length > 0 || !areSetsEqual(new Set(editTags()), notesStore.searchTags());
			}
			const note = existingNote();
			if (!note) {
				return false;
			}
			return editTitle() !== note.title || editContent() !== loadedContent() || editColour() !== note.colour || !areArraysEqual(editTags(), note.tags);
		},
		{ sync: true }
	);
	const draftId = createMemo(() => (isCreateMode() ? "new" : params.id!), { sync: true });
	const debouncedPushUndo = debounce((value: string) => undoRedo.push(value), 300);
	const persistDraft = debounce(() => {
		if (hasUnsavedChanges()) {
			saveDraft(draftId(), editTitle(), editContent(), editTags());
		} else {
			clearDraft(draftId());
		}
	}, 500);

	function adjustTextAreaHeight() {
		if (CSS.supports("field-sizing", "content")) {
			return;
		}
		if (isEditing() && editTextArea) {
			const editor = editTextArea;
			const editorParent = editor?.parentElement;
			if (!editorParent) {
				return;
			}
			const editorClone = editor.cloneNode() as HTMLTextAreaElement;
			editorClone.classList.add("d-hidden");
			editorClone.style.setProperty("height", "auto");
			editorClone.value = editContent();
			editorParent.appendChild(editorClone);
			editor.style.setProperty("height", `calc(${editorClone.scrollHeight}px + 0.5rem)`);
			editorParent.removeChild(editorClone);
		}
	}

	function setFontScaling(operator: "+" | "-") {
		const multiplier = operator === "+" ? 1 : -1;
		appStore.setFontScaleFactor(appStore.fontScaleFactor() + 1 * multiplier);
	}

	function onContentInput(e: Event) {
		const value = (e.target as HTMLTextAreaElement).value;
		setEditContent(value);
		debouncedPushUndo(value);
	}

	function doUndo() {
		undoRedo.undo();
		setEditContent(undoRedo.current());
	}

	function doRedo() {
		undoRedo.redo();
		setEditContent(undoRedo.current());
	}

	function copyToClipboard() {
		navigator.clipboard
			.writeText(loadedContent())
			.then(() => {
				addNotification("success", "Copied to clipboard");
			})
			.catch(err => {
				addNotification("danger", `Failed to copy: ${(err as Error).message}`);
			});
	}

	function startEditing() {
		const note = existingNote();
		setEditTitle(note?.title ?? emptyString);
		setEditContent(loadedContent());
		undoRedo.push(editContent());
		setIsEditing(true);
		setTimeout(adjustTextAreaHeight);
	}

	async function confirmDiscardChanges(): Promise<boolean> {
		return confirm({
			title: "Discard unsaved changes?",
			message: "You have unsaved changes that will be lost if you leave this note.",
			confirmText: "Discard",
			cancelText: "Keep editing",
			variant: "danger"
		});
	}

	async function cancelEditing() {
		if (hasUnsavedChanges()) {
			const ok = await confirmDiscardChanges();
			if (!ok) {
				return;
			}
			clearDraft(draftId());
		}
		if (isCreateMode()) {
			setIsEditing(false);
			navigate(backRoute());
		} else {
			const note = existingNote();
			if (note) {
				setEditTitle(note.title ?? emptyString);
				setEditContent(loadedContent());
				setEditColour(note.colour as Colour);
				setEditTags(note.tags);
			}
			setIsEditing(false);
		}
	}

	async function saveNote() {
		const title = editTitle().trim() || "Untitled";
		const content = editContent();
		const colour = editColour();
		const tags = editTags();
		setIsEditing(false);
		if (isCreateMode()) {
			const note = create(title, content);
			note.colour = colour;
			note.tags = tags?.length ? tags : undefined;
			await notesStore.addNote(note);
			navigate(`/notes/${note.id}`);
		} else if (existingNote()) {
			const { id: noteId, title: noteTitle } = existingNote()!;
			if (colour) {
				await notesStore.setNoteColour(noteId, colour);
			} else {
				await notesStore.unsetNoteColour(noteId);
			}
			notesStore.setNoteTags(noteId, tags);
			if (title !== noteTitle || content !== loadedContent()) {
				await notesStore.updateNote(noteId, title, content);
			}
			setLoadedContent(content);
		}
		clearDraft(draftId());
		requestSync();
	}

	async function updateColour(colour: Colour) {
		if (colour === "none") {
			setEditColour(undefined);
			return;
		}
		setEditColour(colour);
	}

	async function deleteNote() {
		const note = existingNote();
		if (!note) {
			return;
		}
		const ok = await confirm({
			title: "Move note to Trash?",
			message: "This note will be moved to Trash. You can restore it within 30 days.",
			confirmText: "Move to Trash",
			cancelText: "Cancel",
			variant: "danger"
		});
		if (!ok) {
			return;
		}
		await notesStore.trashNote(note.id);
		requestSync();
		navigate(backRoute());
	}

	async function faveCurrent() {
		const note = existingNote();
		if (!note) {
			return;
		}
		await notesStore.faveNote(note.id);
		requestSync();
	}

	async function unfaveCurrent() {
		const note = existingNote();
		if (!note) {
			return;
		}
		await notesStore.unfaveNote(note.id);
		requestSync();
	}

	async function pinCurrent() {
		const note = existingNote();
		if (!note) {
			return;
		}
		await notesStore.pinNote(note.id);
		requestSync();
	}

	async function unpinCurrent() {
		const note = existingNote();
		if (!note) {
			return;
		}
		await notesStore.unpinNote(note.id);
		requestSync();
	}

	async function archiveCurrent() {
		const note = existingNote();
		if (!note) {
			return;
		}
		await notesStore.archiveNote(note.id);
		requestSync();
		if (appStore.lastView() !== "favourited") {
			navigate(backRoute());
		}
	}

	async function unarchiveCurrent() {
		const note = existingNote();
		if (!note) {
			return;
		}
		await notesStore.unarchiveNote(note.id);
		requestSync();
		if (appStore.lastView() !== "favourited") {
			navigate(backRoute());
		}
	}

	async function restoreNote() {
		const note = existingNote();
		if (!note) {
			return;
		}
		await notesStore.restoreFromTrash(note.id);
		requestSync();
		navigate(backRoute());
	}

	async function permanentlyDeleteNote() {
		const note = existingNote();
		if (!note) {
			return;
		}
		const ok = await confirm({
			title: "Permanently delete note?",
			message: "This note will be permanently deleted. This action cannot be undone.",
			confirmText: "Delete Permanently",
			cancelText: "Cancel",
			variant: "danger"
		});
		if (!ok) {
			return;
		}
		const noteId = note.id;
		await notesStore.permanentlyDelete(noteId);
		requestSync([noteId]);
		navigate(backRoute());
	}

	async function restoreDraft() {
		const draft = loadDraft(draftId());
		const baselineTitle = existingNote()?.title ?? emptyString;
		if (draft && (draft.title !== baselineTitle || draft.content !== loadedContent())) {
			const ok = await confirm({
				title: "Restore unsaved draft?",
				message: `An unsaved draft from ${new Date(draft.savedAt).toLocaleString()} was found for this note.`,
				confirmText: "Restore",
				cancelText: "Discard draft"
			});
			if (ok) {
				setIsEditing(true);
				setEditTitle(draft.title);
				setEditContent(draft.content);
				setEditTags(draft.tags);
				undoRedo.push(editContent());
			} else {
				clearDraft(draftId());
			}
		}
	}

	function flushDraft() {
		persistDraft.cancel();
		if (hasUnsavedChanges()) {
			saveDraft(draftId(), editTitle(), editContent(), editTags());
		}
	}

	function formatDate(date?: Date): string {
		if (!date) {
			return emptyString;
		}
		return date.toLocaleDateString(undefined, {
			year: "numeric",
			month: "short",
			day: "numeric",
			hour: "2-digit",
			minute: "2-digit"
		});
	}

	function onBeforeUnload(e: BeforeUnloadEvent) {
		if (hasUnsavedChanges()) {
			e.preventDefault();
		}
	}

	onSettled(() => {
		if (!listViewRoutes.includes(backRoute())) {
			appStore.setLastView(null);
		}
		window.addEventListener("beforeunload", onBeforeUnload);
		window.addEventListener("resize", adjustTextAreaHeight);
		window.addEventListener("pagehide", flushDraft);
		return () => {
			persistDraft.cancel();
			debouncedPushUndo.cancel();
			appStore.setCurrentColour(undefined);
			window.removeEventListener("pagehide", flushDraft);
			window.removeEventListener("resize", adjustTextAreaHeight);
			window.removeEventListener("beforeunload", onBeforeUnload);
		};
	});

	useBeforeLeave(event => {
		if (bypassGuard || !hasUnsavedChanges()) {
			return;
		}
		event.preventDefault();
		(async () => {
			const ok = await confirmDiscardChanges();
			if (ok) {
				bypassGuard = true;
				clearDraft(draftId());
				event.retry(true);
			}
		})();
	});

	createEffect(
		() => params.id,
		id => {
			setIsContentLoaded(isCreateMode());
			setLoadedContent(emptyString);
			setEditContent(emptyString);
			setEditColour(undefined);
			setEditTags(undefined);
			setIsEditing(isCreateMode());
			invoke(async () => {
				if (id && !isCreateMode()) {
					const note = existingNote();
					if (note) {
						setLoadedContent((await notesStore.getNoteContent(id)) ?? emptyString);
						setEditColour(note?.colour as Colour);
						setEditTags(note?.tags ?? []);
					}
				} else {
					setLoadedContent(emptyString);
					setEditTags(Array.from(notesStore.searchTags()));
				}
				setIsContentLoaded(true);
				undoRedo.reset(loadedContent());
				await restoreDraft();
			});
		}
	);

	createEffect(
		() => [editTitle(), editContent(), editTags()],
		() => {
			adjustTextAreaHeight();
			persistDraft();
		},
		{ defer: true }
	);

	createEffect(
		editColour,
		colour => {
			appStore.setCurrentColour(colour);
		},
		{ defer: true }
	);

	return (
		<>
			<div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
				<a href={backRoute()} class="btn btn-outline-secondary btn-sm" aria-label="Back to notes">
					<Icon type="chevronLeft"/>
					<span class="ms-2">Back</span>
				</a>
				<div class="d-flex flex-wrap gap-2 ms-auto">
					<button class="btn btn-outline-secondary btn-sm" onClick={() => setFontScaling("+")} title="Increase font size" aria-label="Increase font size">
						<Icon type="aPlus"/>
					</button>
					<button class="btn btn-outline-secondary btn-sm" onClick={() => setFontScaling("-")} title="Decrease font size" aria-label="Decrease font size">
						<Icon type="aMinus"/>
					</button>
				</div>
				<Show when={!isCreateMode() && !isEditing() && isTrashed()}>
					<div class="d-flex flex-wrap gap-2">
						<button class="btn btn-outline-primary btn-sm" onClick={restoreNote} title="Restore" aria-label="Restore">
							<Icon type="reply"/>
							<span class="d-none d-sm-inline ms-2">Restore</span>
						</button>
						<Show when={existingNote()}>
							<button class="btn btn-outline-secondary btn-sm" onClick={() => exportNote(existingNote()!)} title="Export" aria-label="Export">
								<Icon type="download"/>
								<span class="d-none d-sm-inline ms-2">Export</span>
							</button>
						</Show>
						<button class="btn btn-outline-danger btn-sm" onClick={permanentlyDeleteNote} title="Delete Permanently" aria-label="Delete Permanently">
							<Icon type="trashFill"/>
							<span class="d-none d-sm-inline ms-2">Delete Permanently</span>
						</button>
					</div>
				</Show>
				<Show when={!isCreateMode() && !isEditing() && !isTrashed()}>
					<div class="d-flex flex-wrap gap-2">
						<button class="btn btn-outline-primary btn-sm" onClick={startEditing} title="Edit" aria-label="Edit">
							<Icon type="pen"/>
							<span class="d-none d-sm-inline ms-2">Edit</span>
						</button>
						<button class="btn btn-outline-secondary btn-sm" onClick={copyToClipboard} title="Copy to clipboard" aria-label="Copy to clipboard">
							<Icon type="copy"/>
							<span class="d-none d-sm-inline ms-2">Copy</span>
						</button>
						<Show
							when={isFaved()}
							fallback={
								<button class="btn btn-outline-secondary btn-sm" onClick={faveCurrent} title="Favourite" aria-label="Favourite">
									<Icon type="star"/>
									<span class="d-none d-sm-inline ms-2">Favourite</span>
								</button>
							}>
							<button class="btn btn-outline-secondary btn-sm" onClick={unfaveCurrent} title="Unfavourite" aria-label="Unfavourite">
								<Icon type="starFill"/>
								<span class="d-none d-sm-inline ms-2">Unfavourite</span>
							</button>
						</Show>
						<Show when={!isArchived()}>
							<Show
								when={isPinned()}
								fallback={
									<button class="btn btn-outline-secondary btn-sm" onClick={pinCurrent} title="Pin" aria-label="Pin">
										<Icon type="pinAngle"/>
										<span class="d-none d-sm-inline ms-2">Pin</span>
									</button>
								}>
								<button class="btn btn-outline-secondary btn-sm" onClick={unpinCurrent} title="Unpin" aria-label="Unpin">
									<Icon type="pinAngleFill"/>
									<span class="d-none d-sm-inline ms-2">Unpin</span>
								</button>
							</Show>
						</Show>
						<Show when={existingNote()}>
							<button class="btn btn-outline-secondary btn-sm" onClick={() => exportNote(existingNote()!)} title="Export" aria-label="Export">
								<Icon type="download"/>
								<span class="d-none d-sm-inline ms-2">Export</span>
							</button>
						</Show>
						<Show
							when={isArchived()}
							fallback={
								<button class="btn btn-outline-secondary btn-sm" onClick={archiveCurrent} title="Archive" aria-label="Archive">
									<Icon type="archive"/>
									<span class="d-none d-sm-inline ms-2">Archive</span>
								</button>
							}>
							<button class="btn btn-outline-secondary btn-sm" onClick={unarchiveCurrent} title="Unarchive" aria-label="Unarchive">
								<Icon type="boxArrowUp"/>
								<span class="d-none d-sm-inline ms-2">Unarchive</span>
							</button>
						</Show>
						<button class="btn btn-outline-danger btn-sm" onClick={deleteNote} title="Delete" aria-label="Delete">
							<Icon type="trash"/>
							<span class="d-none d-sm-inline ms-2">Delete</span>
						</button>
					</div>
				</Show>
				<Show when={isEditing()}>
					<div class="d-flex flex-wrap gap-2">
						<div ref={setDropdownToggle} class={["colour-circle toolbar-icon rounded-circle", { [!!editColour() ? `bg-${editColour()}` : `vibgyor`]: true }]} onClick={() => dropdown.toggle()} role="button" aria-label="Apply Colour"></div>
						<button class="btn btn-outline-secondary btn-sm" disabled={!undoRedo.canUndo()} onClick={doUndo} title="Undo" aria-label="Undo">
							<Icon type="arrowCounterclockwise"/>
							<span class="d-none d-sm-inline ms-2">Undo</span>
						</button>
						<button class="btn btn-outline-secondary btn-sm" disabled={!undoRedo.canRedo()} onClick={doRedo} title="Redo" aria-label="Redo">
							<Icon type="arrowClockwise"/>
							<span class="d-none d-sm-inline ms-2">Redo</span>
						</button>
						<button class="btn btn-primary btn-sm" disabled={!hasUnsavedChanges()} onClick={saveNote} title="Save" aria-label="Save">
							<Icon type="floppy"/>
							<span class="d-none d-sm-inline ms-2">Save</span>
						</button>
						<button class="btn btn-outline-secondary btn-sm" onClick={cancelEditing} title="Cancel" aria-label="Cancel">
							<Icon type="xLg"/>
							<span class="d-none d-sm-inline ms-2">Cancel</span>
						</button>
					</div>
				</Show>
			</div>
			<Show when={dropdown.show()}>
				<div class="d-flex justify-content-end mb-3">
					<DisplayColourList selected={editColour()} onSelectionChanged={updateColour}/>
				</div>
			</Show>
			<Show when={!isEditing() && existingNote()}>
				<h2 class="note-title mb-3">{existingNote()!.title}</h2>
				<div class="d-flex flex-wrap gap-2">
					<div class="badge text-bg-secondary">Created {formatDate(existingNote()!.createdAt)}</div>
					<Show when={existingNote()!.modifiedAt}>
						<div class="badge text-bg-secondary">Modified {formatDate(existingNote()!.modifiedAt)}</div>
					</Show>
				</div>
				<hr/>
				<Show when={!isContentLoaded()} fallback={<div class="note-content">{loadedContent()}</div>}>
					<Spinner message="Loading note..." showMessage={false}/>
				</Show>
			</Show>
			<div class="edit-note">
				<Show when={isEditing()}>
					<input ref={titleInputRef} value={editTitle()} onInput={e => setEditTitle(e.currentTarget.value.trim())} type="text" class="form-control form-control-lg" placeholder="Title"/>
					<hr class="my-1"/>
					<textarea ref={editTextArea} value={editContent()} onInput={onContentInput} class="form-control note-textarea" placeholder="Start writing..." rows="12"></textarea>
				</Show>
			</div>
			<Show when={!!editTags()?.length || isEditing()} fallback={<hr/>}>
				<DisplayTagList class="my-3" activeTags={editTags()} allowEdit={isEditing()} allowCreate={true} onSelectionChanged={setEditTags}/>
			</Show>
			<Show when={hasContent()}>
				<div class="d-flex flex-wrap gap-2 mt-3">
					<Show when={sentenceCount()}>
						<span class="badge text-bg-secondary">{sentenceCount()} sentences</span>
					</Show>
					<Show when={wordCount()}>
						<span class="badge text-bg-secondary">{wordCount()} words</span>
					</Show>
					<Show when={characterCount()}>
						<span class="badge text-bg-secondary">{characterCount()} characters</span>
					</Show>
				</div>
			</Show>
		</>
	);
}