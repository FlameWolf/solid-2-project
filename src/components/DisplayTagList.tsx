import { createEffect, createMemo, createSignal, createStore, For, Match, onSettled, Show, Switch } from "solid-js";
import { useNavigate } from "@solidjs/router";
import { dynamic } from "@solidjs/web";
import { emptyString } from "@/constants/common";
import { areSetsEqual, normaliseTag, titleCase } from "@/utils/common";
import { getTime } from "@/utils/dates";
import { contains, equals, sort } from "@/utils/text-analysis";
import * as notesStore from "@/stores/notes";
import { confirm } from "@/composables/useConfirmDialogue";
import { useDropdown } from "@/composables/useDropdown";
import { exitSelectionMode, isSelecting, selectedCount, selectedIds } from "@/composables/useNoteSelection";
import { requestSync } from "@/composables/useNotesSync";
import { useTruncate } from "@/composables/useTruncate";
import Icon from "@/components/Icon";

interface Props {
	activeTags?: string[];
	allowCreate?: boolean;
	allowDelete?: boolean;
	allowEdit?: boolean;
	allowManage?: boolean;
	class?: string;
	showFilterType?: boolean;
	onSelectionChanged?: (tags: string[]) => void;
}

export default function DisplayTagList(props: Props) {
	let syncingUp = false;
	let syncingDown = false;
	let lastSelected: string[] = [];
	const navigate = useNavigate();
	const [searchText, setSearchText] = createSignal(emptyString);
	const [selectedTags, setSelectedTags] = createSignal<string[]>([]);
	const [dropdownToggle, setDropdownToggle] = createSignal<HTMLElement | undefined>();
	const [dropdownMenu, setDropdownMenu] = createSignal<HTMLElement | undefined>();
	const dropdown = useDropdown(dropdownToggle, {
		autoClose: false,
		dropdown: dropdownMenu
	});
	const searchInputRef = useTruncate(searchText, setSearchText, 256);
	const flexModifiers = createMemo(() => ({
		[dropdown.show() ? "flex-column" : "flex-wrap"]: true
	}));
	const filteredTags = createMemo(() => sort(!searchText() ? notesStore.tags() : notesStore.tags().filter(tag => contains(tag, searchText()))));
	const allSelected = createMemo(() => filteredTags().every(tag => selectedTags().includes(tag)));
	const hasExactMatch = createMemo(() => !searchText() || notesStore.tags().some(tag => equals(tag, normaliseTag(searchText()))));
	const enableActions = createMemo(() => !!(selectedCount() && selectedTags().length));
	const [wrapperElem] = createStore({ value: dynamic(() => props.allowEdit ? "div" : "a") });

	function syncState(direction: "up" | "down") {
		if (!props.allowEdit || isSelecting()) {
			return;
		}
		if (areSetsEqual(new Set(selectedTags()), notesStore.searchTags())) {
			return;
		}
		switch (direction) {
			case "up": {
				syncingUp = true;
				notesStore.setSearchTags(selectedTags());
				break;
			}
			case "down": {
				syncingDown = true;
				setSelectedTags(Array.from(notesStore.searchTags()));
				break;
			}
		}
	}

	function isTagSelected(tag: string) {
		return selectedTags().includes(tag);
	}

	function toggleTagSelection(tag: string) {
		if (isTagSelected(tag)) {
			setSelectedTags(tags => tags.toSpliced(tags.indexOf(tag), 1));
			return;
		}
		setSelectedTags(selectedTags().concat(tag));
	}

	function toggleSelectAll() {
		if (!allSelected()) {
			setSelectedTags(Array.from(filteredTags()));
			return;
		}
		setSelectedTags([]);
	}

	function unselectTag(tag: string) {
		const index = selectedTags().indexOf(tag);
		if (index !== -1) {
			setSelectedTags(tags => tags.toSpliced(index, 1));
		}
	}

	async function createTag(tag: string) {
		const normalised = normaliseTag(tag);
		await notesStore.createTag(normalised);
		setSelectedTags(tags => tags.concat(normalised));
	}

	async function deleteTags(tags: string[]) {
		const hasMany = tags.length > 1;
		const suffix = hasMany ? "s" : emptyString;
		dropdown.toggle(false);
		const ok = await confirm({
			title: `Delete selected tag${suffix} permanently?`,
			message: `The selected tag${suffix} will be deleted permanently. ${hasMany ? "They" : "It"} will also be removed from any notes that use ${hasMany ? "them" : "it"}.`,
			confirmText: "Delete Tags",
			cancelText: "Cancel",
			variant: "danger"
		});
		if (ok) {
			setSelectedTags(selected => selected.filter(tag => !tags.includes(tag)));
			const affectedCount = await notesStore.deleteTags(tags.map(normaliseTag));
			if (affectedCount) {
				requestSync();
			}
		}
	}

	async function updateNoteTags(action: "add" | "remove") {
		const now = Date.now();
		const isAdding = action === "add";
		dropdown.toggle(false);
		const ok = await confirm({
			title: `${titleCase(action)} tags`,
			message: `The selected tags will be ${isAdding ? "added" : "removed"} ${isAdding ? "to" : "from"} the selected notes. Do you want to proceed?`,
			confirmText: "Confirm",
			cancelText: "Cancel",
			variant: "warning"
		});
		if (!ok) {
			return;
		}
		switch (action) {
			case "add": {
				notesStore.addTagsMultiple(Array.from(selectedIds()), selectedTags());
				break;
			}
			case "remove": {
				notesStore.removeTagsMultiple(Array.from(selectedIds()), selectedTags());
				break;
			}
		}
		if (notesStore.notes().some(note => selectedIds().has(note.id) && getTime(note.stateChangedAt) > now)) {
			requestSync();
		}
		exitSelectionMode();
	}

	function addToSearchTags(tag: string) {
		if (props.allowEdit) {
			return;
		}
		notesStore.addSearchTag(tag);
		navigate("/");
	}

	onSettled(() => {
		setSelectedTags(props.activeTags ?? []);
	});

	createEffect(
		isSelecting,
		(curr, prev) => {
			if (!prev) {
				lastSelected = selectedTags();
			}
			if (!curr) {
				setSelectedTags(lastSelected);
			}
		},
		{ defer: true }
	);

	createEffect(
		() => props.allowEdit,
		value => {
			if (!value) {
				dropdown.toggle(false);
				setSelectedTags(props.activeTags ?? []);
			}
		},
		{ defer: true }
	);

	createEffect(
		selectedTags,
		tags => {
			props.onSelectionChanged?.(tags);
			if (!syncingDown && props.allowManage) {
				syncState("up");
			}
			syncingDown = false;
		},
		{ defer: true }
	);

	createEffect(
		notesStore.searchTags,
		() => {
			if (!syncingUp) {
				syncState("down");
			}
			syncingUp = false;
		},
		{ defer: true }
	);

	return (
		<div class={["d-flex gap-1 p-1 border rounded", { ...flexModifiers(), [props.class as string]: !!props.class }]}>
			<div class="dropdown w-100">
				<div ref={setDropdownMenu} class={["d-flex gap-1 align-items-center", flexModifiers()]}>
					<Show when={props.allowEdit} fallback={<label class="small align-self-start border rounded px-2 py-1">Tags</label>}>
						<button ref={setDropdownToggle} class="btn btn-sm btn-outline-secondary align-self-start dropdown-toggle" onClick={() => dropdown.toggle()}>Tags</button>
					</Show>
					<Switch>
						<Match when={dropdown.show()}>
							<div class="dropdown-menu show w-100 position-relative tag-list">
								<Show when={props.allowManage}>
									<div class="d-flex gap-2 px-3 py-1">
										<label class="btn btn-sm btn-outline-secondary flex-grow-1">
											<input type="checkbox" class="form-check-input" checked={allSelected()} disabled={!filteredTags().length} onChange={toggleSelectAll}/>
											<span class="ms-2">{allSelected() ? "Deselect All" : "Select All"}</span>
										</label>
										<Show when={props.allowDelete}>
											<button class="btn btn-sm btn-outline-danger flex-grow-1" disabled={!selectedTags().length} onClick={() => deleteTags(selectedTags())}>Delete Selected</button>
										</Show>
									</div>
									<div class="dropdown-divider"></div>
								</Show>
								<div class="d-flex gap-2 px-3 py-1">
									<div class={["flex-nowrap w-100", { "input-group": !!props.allowCreate }]}>
										<input ref={searchInputRef} value={searchText()} onInput={e => setSearchText(e.currentTarget.value.trim())} type="text" class="form-control form-control-sm" placeholder="Search"/>
										<Show when={props.allowCreate}>
											<button class="btn btn-sm btn-outline-secondary" disabled={hasExactMatch()} onClick={() => createTag(searchText())}>
												<Icon type="plusLg"/>
											</button>
										</Show>
									</div>
								</div>
								<Show when={filteredTags().length}>
									<div class="dropdown-divider"></div>
									<div class="d-flex flex-wrap gap-4 px-3">
										<For each={filteredTags()}>
											{tag => (
												<label>
													<input type="checkbox" class="form-check-input" checked={isTagSelected(tag)} onChange={() => toggleTagSelection(tag)}/>
													<span class="text-wrap text-break ms-2">{tag}</span>
												</label>
											)}
										</For>
									</div>
								</Show>
							</div>
						</Match>
						<Match when={selectedTags().length}>
							<For each={selectedTags()}>
								{tag => (
									<wrapperElem.value class={["badge text-bg-secondary", { "py-2": !props.allowEdit }]} onClick={() => addToSearchTags(tag)} {...(props.allowEdit ? {} : { role: "button" })}>
										<span>{tag}</span>
										<Show when={props.allowEdit}>
											<button class="small btn-close ms-2" onClick={() => unselectTag(tag)}></button>
										</Show>
									</wrapperElem.value>
								)}
							</For>
						</Match>
					</Switch>
					<Show when={selectedTags().length}>
						<Switch>
							<Match when={props.showFilterType}>
								<div class="input-group input-group-sm flex-nowrap w-auto ms-auto">
									<span class="input-group-text">Match:</span>
									<label class={["btn btn-outline-secondary", { [`active`]: notesStore.tagFilter() === `any` }]}>
										<input type="radio" class="btn-check" name="filter-type" onChange={() => notesStore.setFilterType(`any`)}/>
										<span>Any</span>
									</label>
									<label class={["btn btn-outline-secondary", { [`active`]: notesStore.tagFilter() === `all` }]}>
										<input type="radio" class="btn-check" name="filter-type" onChange={() => notesStore.setFilterType(`all`)}/>
										<span>All</span>
									</label>
								</div>
							</Match>
							<Match when={isSelecting()}>
								<div class="d-flex gap-1 ms-auto">
									<button class="btn btn-sm btn-outline-primary" disabled={!enableActions()} onClick={() => updateNoteTags("add")}>Apply</button>
									<button class="btn btn-sm btn-outline-danger" disabled={!enableActions()} onClick={() => updateNoteTags("remove")}>Remove</button>
								</div>
							</Match>
						</Switch>
					</Show>
				</div>
			</div>
		</div>
	);
}