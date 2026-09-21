import { createEffect, createMemo, createSignal, For, Loading, Match, onSettled, Show, Switch } from "solid-js";
import { useBeforeLeave } from "@solidjs/router";
import { bulkActions } from "@/constants/actions";
import { colours } from "@/constants/colours";
import * as appStore from "@/stores/app";
import * as notesStore from "@/stores/notes";
import { confirm } from "@/composables/useConfirmDialogue";
import { useDropdown } from "@/composables/useDropdown";
import { exportAllNotes, exportNotes, importFiles } from "@/composables/useFileIO";
import { clearSelection, enterSelectionMode, exitSelectionMode, isSelected, isSelecting, selectAll, selectedCount, toggleSelection } from "@/composables/useNoteSelection";
import { getSortedNotes, setSortField, sortField, sortOrder, toggleSortDirection, type SortField } from "@/composables/useNoteSort";
import { requestSync } from "@/composables/useNotesSync";
import Icon from "@/components/Icon";
import EmptyState from "@/components/EmptyState";
import Spinner from "@/components/Spinner";
import SortControls from "@/components/SortControls";
import DisplayColourList from "@/components/DisplayColourList";
import DisplayTagList from "@/components/DisplayTagList";
import NoteCard from "@/components/NoteCard";
import SelectionActionBar from "@/components/SelectionActionBar";
import type { Note } from "@/models/Note";
import type { UUID } from "crypto";

interface Props {
	view?: View;
}
type NoteSection = {
	key: string;
	notes: Note[];
	divider?: string;
	showNewCard?: boolean;
};

export default function DisplayNoteList(props: Props) {
	const [dropdownToggle, setDropdownToggle] = createSignal<HTMLElement>();
	const [dropdownMenu, setDropdownMenu] = createSignal<HTMLElement>();
	const dropdown = useDropdown(dropdownToggle, {
		autoClose: false,
		dropdown: dropdownMenu
	});
	const view = createMemo<View>(() => props.view ?? "active", { sync: true });
	const isSearchMode = createMemo(() => !!notesStore.searchText(), { sync: true });
	const sourceNotes = createMemo<Note[]>(
		() => {
			switch (view()) {
				case "favourited":
					return notesStore.favedNotes();
				case "archived":
					return notesStore.archivedNotes();
				case "trash":
					return notesStore.trashedNotes();
				default:
					return notesStore.activeNotes();
			}
		},
		{ sync: true }
	);
	const sortedNotes = createMemo(() => getSortedNotes(sourceNotes()), { sync: true });
	const noteSections = createMemo(
		() => {
			if (view() === "favourited") {
				const sections: NoteSection[] = [
					{
						key: "active",
						notes: sortedNotes().filter(n => !n.archivedAt)
					}
				];
				const archived = sortedNotes().filter(n => n.archivedAt);
				if (archived.length) {
					sections.push({
						key: "archived",
						notes: archived,
						divider: "ARCHIVE"
					});
				}
				return sections;
			}
			return [
				{
					key: "all",
					notes: sortedNotes(),
					showNewCard: view() === "active"
				}
			];
		},
		{ sync: true }
	);
	const hasNotes = createMemo(() => sourceNotes().length > 0, { sync: true });
	const allSelected = createMemo(() => sourceNotes().length > 0 && selectedCount() === sourceNotes().length, { sync: true });
	const selectAllText = createMemo(() => (allSelected() ? "Deselect All" : "Select All"), { sync: true });
	const pageTitle = createMemo(
		() => {
			switch (view()) {
				case "favourited":
					return "Favourited";
				case "archived":
					return "Archived";
				case "trash":
					return "Trash";
				default:
					return "Notes";
			}
		},
		{ sync: true }
	);
	const emptyMessage = createMemo(
		() => {
			switch (view()) {
				case "favourited":
					return "No favourited notes";
				case "archived":
					return "No archived notes";
				case "trash":
					return "Trash is empty";
				default:
					return "No notes yet";
			}
		},
		{ sync: true }
	);
	const selectionActions = createMemo<SelectionAction[]>(
		() => {
			if (view() === "trash") {
				return bulkActions.filter(action => action.key === "restore" || action.key === "permanent");
			}
			const actionKeys = new Set<SelectionAction["key"]>(["export", "trash"]);
			switch (view()) {
				case "favourited": {
					actionKeys.add("unfave");
					break;
				}
				case "archived": {
					actionKeys.add("unarchive");
					break;
				}
				default: {
					actionKeys.add("fave");
					actionKeys.add("archive");
					break;
				}
			}
			return bulkActions.filter(action => actionKeys.has(action.key));
		},
		{ sync: true }
	);

	function onSortFieldChange(e: Event) {
		setSortField((e.target as HTMLSelectElement).value as SortField);
	}

	function onTileClick(e: MouseEvent, noteId: UUID) {
		if (isSelecting()) {
			e.preventDefault();
			toggleSelection(noteId);
		}
	}

	function toggleSelectAll() {
		if (allSelected()) {
			clearSelection();
		} else {
			selectAll(sourceNotes().map(n => n.id));
		}
	}

	function getSelectedNotes(): Note[] {
		return sourceNotes().filter(n => isSelected(n.id));
	}

	function getSelectedIds(): UUID[] {
		return getSelectedNotes().map(n => n.id);
	}

	async function handleImport() {
		const importedCount = await importFiles();
		if (importedCount > 0) {
			requestSync();
		}
	}

	function isValidColour(input: string): boolean {
		return colours.includes(input as Colour);
	}

	function updateSearchColours(colour: Colour) {
		switch (colour) {
			case "none": {
				notesStore.setSearchColours([]);
				break;
			}
			default: {
				notesStore.toggleSearchColour(colour);
				break;
			}
		}
	}

	async function handleSelectionAction(key: SelectionAction["key"]) {
		const ids = getSelectedIds();
		const idCount = ids.length;
		if (idCount === 0) {
			return;
		}
		let syncNotes = true;
		let purgeNotes = false;
		const noun = idCount === 1 ? "note" : "notes";
		switch (key) {
			case "export": {
				await exportNotes(getSelectedNotes());
				syncNotes = false;
				break;
			}
			case "fave": {
				notesStore.faveMultiple(ids);
				break;
			}
			case "unfave": {
				notesStore.unfaveMultiple(ids);
				break;
			}
			case "archive": {
				notesStore.archiveMultiple(ids);
				break;
			}
			case "unarchive": {
				notesStore.unarchiveMultiple(ids);
				break;
			}
			case "trash": {
				const ok = await confirm({
					title: `Move ${idCount} ${noun} to Trash?`,
					message: `${idCount === 1 ? "This note" : "These notes"} can be restored from Trash within 30 days.`,
					confirmText: "Move to Trash",
					cancelText: "Cancel",
					variant: "danger"
				});
				if (!ok) {
					return;
				}
				notesStore.trashMultiple(ids);
				break;
			}
			case "restore": {
				notesStore.restoreFromTrashMultiple(ids);
				break;
			}
			case "permanent": {
				const ok = await confirm({
					title: `Permanently delete ${idCount} ${noun}?`,
					message: "This action cannot be undone.",
					confirmText: "Delete Permanently",
					cancelText: "Cancel",
					variant: "danger"
				});
				if (!ok) {
					return;
				}
				notesStore.permanentlyDeleteMultiple(ids);
				purgeNotes = true;
				break;
			}
			default: {
				if (isValidColour(key)) {
					if (key === "none") {
						notesStore.unsetColourMultiple(ids);
						break;
					}
					notesStore.setColourMultiple(ids, key);
				}
				break;
			}
		}
		if (syncNotes) {
			requestSync(purgeNotes ? ids : undefined);
		}
		exitSelectionMode();
	}

	async function handleEmptyTrash() {
		const trashed = notesStore.trashedNotes();
		const count = trashed.length;
		if (count === 0) {
			return;
		}
		const ok = await confirm({
			title: "Empty Trash?",
			message: `${count} ${count === 1 ? "note" : "notes"} will be permanently deleted. This cannot be undone.`,
			confirmText: "Empty Trash",
			cancelText: "Cancel",
			variant: "danger"
		});
		if (!ok) {
			return;
		}
		const trashedNoteIds = trashed.map(n => n.id);
		notesStore.permanentlyDeleteMultiple(trashedNoteIds);
		requestSync(trashedNoteIds);
	}

	onSettled(() => {
		exitSelectionMode();
	});

	useBeforeLeave(() => {
		appStore.setLastView(view());
	});

	createEffect(view, exitSelectionMode, { defer: true });

	return (
		<>
			<Show when={view() !== "active"}>
				<div class="d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
					<h2 class="mb-0">{pageTitle()}</h2>
					<a href="/notes" class="btn btn-outline-secondary btn-sm">
						<Icon type="chevronLeft"/>
						<span class="ms-2">Back to Notes</span>
					</a>
				</div>
			</Show>
			<Loading fallback={<Spinner message="Loading notes..."/>}>
				<Switch fallback={
						<EmptyState showActions={view() === "active"} showCreate={!isSearchMode()} importAction={handleImport}>
							<Show when={isSearchMode()} fallback={emptyMessage()}>
								<span>No results found for <mark>{notesStore.searchText()}</mark></span>
								<Show when={view() === "active"}>
									<div class="mt-3">
										<em>Look in:</em>
									</div>
								</Show>
							</Show>
						</EmptyState>
					}>
					<Match when={notesStore.isSearching()}>
						<Spinner message="Searching..."/>
					</Match>
					<Match when={hasNotes() || notesStore.searchTags().size || notesStore.searchColours().size}>
						<div>
							<div class="d-flex gap-2 mb-3 justify-content-end flex-wrap">
								<Show
									when={isSelecting()}
									fallback={
										<>
											<SortControls sortField={sortField()} sortOrder={sortOrder()} sortAction={onSortFieldChange} toggleAction={toggleSortDirection}/>
											<div ref={setDropdownToggle} class="colour-circle vibgyor toolbar-icon rounded-circle" onClick={() => dropdown.toggle()} role="button" aria-label="Colour Filters">
												<Show when={notesStore.searchColours().size}>
													<Icon type="check2"/>
												</Show>
											</div>
											<button class="btn btn-outline-secondary btn-sm" onClick={enterSelectionMode} title="Select" aria-label="Select">
												<Icon type="check2Square"/>
												<span class="d-none d-sm-inline ms-2">Select</span>
											</button>
											<Show when={view() === "active"}>
												<button class="btn btn-outline-secondary btn-sm" onClick={handleImport} title="Import" aria-label="Import">
													<Icon type="boxArrowDownRight"/>
													<span class="d-none d-sm-inline ms-2">Import</span>
												</button>
												<button class="btn btn-outline-secondary btn-sm" onClick={exportAllNotes} title="Export All" aria-label="Export All">
													<Icon type="boxArrowUpRight"/>
													<span class="d-none d-sm-inline ms-2">Export All</span>
												</button>
												<a href="/notes/favourite" class="btn btn-outline-secondary btn-sm" title="Favourited" aria-label="Favourited">
													<Icon type="star"/>
													<span class="d-none d-sm-inline ms-2">Favourited</span>
												</a>
												<a href="/notes/archive" class="btn btn-outline-secondary btn-sm" title="Archived" aria-label="Archived">
													<Icon type="archive"/>
													<span class="d-none d-sm-inline ms-2">Archived</span>
												</a>
												<a href="/notes/trash" class="btn btn-outline-secondary btn-sm" title="Trash" aria-label="Trash">
													<Icon type="trash"/>
													<span class="d-none d-sm-inline ms-2">Trash</span>
												</a>
											</Show>
											<Show when={view() === "trash"}>
												<button class="btn btn-outline-danger btn-sm" onClick={handleEmptyTrash} title="Empty Trash" aria-label="Empty Trash">
													<Icon type="trashFill"/>
													<span class="d-none d-sm-inline ms-2">Empty Trash</span>
												</button>
											</Show>
										</>
									}>
									<button class="btn btn-outline-secondary btn-sm" onClick={toggleSelectAll} title={selectAllText()} aria-label={selectAllText()}>
										<Icon type={allSelected() ? "list" : "listCheck"}/>
										<span class="d-none d-sm-inline ms-2">{selectAllText()}</span>
									</button>
									<button class="btn btn-outline-secondary btn-sm" onClick={exitSelectionMode} title="Cancel" aria-label="Cancel">
										<Icon type="xCircle"/>
										<span class="d-none d-sm-inline ms-2">Cancel</span>
									</button>
								</Show>
							</div>
							<Show when={dropdown.show()}>
								<div ref={setDropdownMenu} class="d-flex justify-content-end mb-3">
									<DisplayColourList filterMode={true} onSelectionChanged={updateSearchColours}/>
								</div>
							</Show>
							<DisplayTagList class="mb-3" activeTags={Array.from(notesStore.searchTags())} allowCreate={isSelecting()} allowDelete={true} allowEdit={true} allowManage={!isSelecting()} showFilterType={!isSelecting()}/>
							<For each={noteSections()}>
								{section => (
									<>
										<Show when={section.divider}>
											<div class="d-flex align-items-center my-4">
												<div class="flex-grow-1 border-bottom"></div>
												<span class="px-3 text-muted small">{section.divider}</span>
												<div class="flex-grow-1 border-bottom"></div>
											</div>
										</Show>
										<div class="notes-grid">
											<Show when={section.showNewCard && !isSelecting()}>
												<a href="/notes/new" class="card note-card new-note-card text-decoration-none">
													<div class="card-body d-flex align-items-center justify-content-center">
														<span class="fs-1 text-muted">+</span>
													</div>
												</a>
											</Show>
											<For each={section.notes}>{note => <NoteCard note={note} selectionMode={isSelecting()} selected={isSelected(note.id)} clickAction={onTileClick}/>}</For>
										</div>
									</>
								)}
							</For>
							<Show when={isSelecting() && selectedCount() > 0}>
								<SelectionActionBar showColours={true} selectedCount={selectedCount()} actions={selectionActions()} onAction={handleSelectionAction} onCancel={exitSelectionMode}/>
							</Show>
						</div>
					</Match>
				</Switch>
			</Loading>
		</>
	);
}