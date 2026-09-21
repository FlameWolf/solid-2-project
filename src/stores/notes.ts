import { createMemo, createSignal, createStore, snapshot } from "solid-js";
import { emptyString } from "@/constants/common";
import { TRASH_RETENTION_MS } from "@/constants/notes";
import { arrayContainsSet, invoke, mergeArrays } from "@/utils/common";
import { contains } from "@/utils/text-analysis";
import { addTags, archive, fave, pin, removeTags, restore, setColour, trash, unarchive, unfave, unpin, unsetColour, update, type Note } from "@/models/Note";
import { notesRepository } from "@/storage/NotesRepository";
import { tagsRepository } from "@/storage/TagsRepository";
import type { UUID } from "crypto";

type FilterType = "any" | "all";

interface NotesState {
	notes: Note[];
	tags: string[];
	searchText: string;
	searchColours: Set<string>;
	searchTags: Set<string>;
	tagFilter: FilterType;
	isLoading: boolean;
	isSearching: boolean;
}

const [store, setStore] = createStore<NotesState>(
	async draft => {
		try {
			draft.notes = await notesRepository.loadAll();
			draft.tags = await tagsRepository.loadAll();
		} catch (err) {
			console.error("Failed to load notes from storage", err);
		} finally {
			draft.isLoading = false;
		}
	},
	{
		notes: [],
		tags: [],
		searchText: emptyString,
		searchColours: new Set<string>(),
		searchTags: new Set<string>(),
		tagFilter: "any",
		isLoading: true,
		isSearching: false
	},
	{ seedLoadingValue: true }
);
const [contentMatchedIds, setContentMatchedIds] = createSignal(new Set<UUID>());
export const notes = () => store.notes;
export const tags = () => store.tags;
export const searchText = createMemo(() => store.searchText, { sync: true });
export const searchColours = createMemo(() => new Set(Array.from(store.searchColours)), { sync: true });
export const searchTags = createMemo(() => new Set(Array.from(store.searchTags)), { sync: true });
export const tagFilter = createMemo(() => store.tagFilter, { sync: true });
export const isLoading = createMemo(() => store.isLoading, { sync: true });
export const isSearching = createMemo(() => store.isSearching, { sync: true });
export const searchResults = createMemo(
	() => {
		const trimmed = store.searchText.trim();
		const predicates: Array<(note: Note) => boolean> = [];
		if (trimmed) {
			predicates.push(note => contains(note.title, trimmed) || contentMatchedIds().has(note.id));
		}
		if (store.searchColours.size > 0) {
			predicates.push(note => !!note.colour && store.searchColours.has(note.colour));
		}
		if (store.searchTags.size > 0) {
			predicates.push(note => {
				switch (store.tagFilter) {
					case "any": {
						return note.tags?.some(tag => store.searchTags.has(tag)) ?? false;
					}
					case "all": {
						return !!note.tags && arrayContainsSet(note.tags, store.searchTags);
					}
				}
			});
		}
		const results = store.notes.filter(note => predicates.every(predicate => predicate(note)));
		return results;
	},
	{ sync: true }
);
export const activeNotes = createMemo(() => searchResults().filter(note => !note.archivedAt && !note.deletedAt), { sync: true });
export const favedNotes = createMemo(() => searchResults().filter(note => note.favedAt && !note.deletedAt), { sync: true });
export const archivedNotes = createMemo(() => searchResults().filter(note => note.archivedAt && !note.deletedAt), { sync: true });
export const trashedNotes = createMemo(() => searchResults().filter(note => note.deletedAt), { sync: true });

export function setSearchText(query: string) {
	const trimmed = query.trim();
	setStore(draft => {
		draft.searchText = trimmed;
	});
	if (!trimmed) {
		setStore(draft => {
			draft.isSearching = false;
		});
		setContentMatchedIds(new Set<UUID>());
		return;
	}
	setStore(draft => {
		draft.isSearching = true;
	});
	notesRepository
		.search(content => contains(content, trimmed))
		.then(matches => {
			setContentMatchedIds(matches as Set<UUID>);
		})
		.finally(() => {
			setStore(draft => {
				draft.isSearching = false;
			});
		});
}

export function toggleSearchColour(colour: string) {
	setStore(draft => {
		const next = new Set(draft.searchColours);
		if (!next.delete(colour)) {
			next.add(colour);
		}
		draft.searchColours = next;
	});
}

export function setSearchColours(colours: string[]) {
	setStore(draft => {
		draft.searchColours = new Set(colours);
	});
}

export function addSearchTag(tag: string) {
	setStore(draft => {
		const next = new Set(draft.searchTags);
		next.add(tag);
		draft.searchTags = next;
	});
}

export function setSearchTags(tags: string[]) {
	setStore(draft => {
		draft.searchTags = new Set(tags);
	});
}

export function setFilterType(type: FilterType) {
	setStore(draft => {
		draft.tagFilter = type;
	});
}

export function setNoteTags(id: UUID, tags: string[] | undefined) {
	setStore(draft => {
		const note = draft.notes.find(note => note.id === id);
		if (!note) {
			return;
		}
		note.tags = tags?.length ? tags : undefined;
	});
}

export async function addNote(note: Note) {
	setStore(draft => {
		draft.notes = draft.notes.concat(note);
		draft.tags = mergeArrays(draft.tags, note.tags);
	});
	await notesRepository.saveFull(snapshot(note));
}

export function updateNote(id: UUID, title: string, content: string) {
	setStore(draft => {
		const note = draft.notes.find(note => note.id === id);
		if (!note) {
			return;
		}
		update(note, title, content);
		draft.tags = mergeArrays(draft.tags, note.tags);
		invoke(async () => {
			await notesRepository.saveFull(snapshot(note));
		});
	});
}

export function getNote(id: UUID): Note | undefined {
	return store.notes.find(note => note.id === id);
}

export function getNoteContent(id: UUID): Promise<string | undefined> {
	return notesRepository.loadContent(id);
}

async function applyToNote(id: UUID, mutator: (note: Note) => void) {
	setStore(draft => {
		const note = draft.notes.find(note => note.id === id);
		if (!note) {
			return;
		}
		mutator(note);
		invoke(async () => {
			await notesRepository.saveMeta(snapshot(note));
		});
	});
}

async function applyToMany(ids: ReadonlyArray<UUID>, mutator: (note: Note) => void) {
	const idSet = new Set<UUID>(ids);
	setStore(draft => {
		const targetNotes = draft.notes.filter(note => idSet.has(note.id));
		targetNotes.forEach(mutator);
		invoke(async () => {
			await notesRepository.saveManyMeta(snapshot(targetNotes));
		});
	});
}

export function faveNote(id: UUID) {
	applyToNote(id, fave);
}

export function faveMultiple(ids: ReadonlyArray<UUID>) {
	applyToMany(ids, fave);
}

export function unfaveNote(id: UUID) {
	applyToNote(id, unfave);
}

export function unfaveMultiple(ids: ReadonlyArray<UUID>) {
	applyToMany(ids, unfave);
}

export function pinNote(id: UUID) {
	applyToNote(id, pin);
}

export function unpinNote(id: UUID) {
	applyToNote(id, unpin);
}

export function archiveNote(id: UUID) {
	applyToNote(id, archive);
}

export function archiveMultiple(ids: ReadonlyArray<UUID>) {
	applyToMany(ids, archive);
}

export function unarchiveNote(id: UUID) {
	applyToNote(id, unarchive);
}

export function unarchiveMultiple(ids: ReadonlyArray<UUID>) {
	applyToMany(ids, unarchive);
}

export function trashNote(id: UUID) {
	applyToNote(id, trash);
}

export function trashMultiple(ids: ReadonlyArray<UUID>) {
	applyToMany(ids, trash);
}

export function restoreFromTrash(id: UUID) {
	applyToNote(id, restore);
}

export function restoreFromTrashMultiple(ids: ReadonlyArray<UUID>) {
	applyToMany(ids, restore);
}

export async function setNoteColour(id: UUID, colour: string) {
	await applyToNote(id, note => setColour(note, colour));
}

export async function setColourMultiple(ids: ReadonlyArray<UUID>, colour: string) {
	await applyToMany(ids, note => setColour(note, colour));
}

export async function unsetNoteColour(id: UUID) {
	await applyToNote(id, unsetColour);
}

export async function unsetColourMultiple(ids: ReadonlyArray<UUID>) {
	await applyToMany(ids, unsetColour);
}

export async function addNoteTags(id: UUID, tags: string[]) {
	await applyToNote(id, note => addTags(note, tags));
	setStore(draft => {
		draft.tags = mergeArrays(draft.tags, tags);
	});
}

export async function addTagsMultiple(ids: ReadonlyArray<UUID>, tags: string[]) {
	await applyToMany(ids, note => addTags(note, tags));
	setStore(draft => {
		draft.tags = mergeArrays(draft.tags, tags);
	});
}

export async function removeNoteTags(id: UUID, tags: string[]) {
	await applyToNote(id, note => removeTags(note, tags));
}

export async function removeTagsMultiple(ids: ReadonlyArray<UUID>, tags: string[]) {
	await applyToMany(ids, note => removeTags(note, tags));
}

export async function permanentlyDelete(id: UUID) {
	const index = store.notes.findIndex(note => note.id === id);
	if (index === -1) {
		return;
	}
	setStore(draft => {
		draft.notes = draft.notes.toSpliced(index, 1);
	});
	await notesRepository.remove(id);
}

export async function permanentlyDeleteMultiple(ids: ReadonlyArray<UUID>) {
	const idSet = new Set<UUID>(ids);
	setStore(draft => {
		draft.notes = draft.notes.filter(note => !idSet.has(note.id));
	});
	await notesRepository.removeMany(ids as UUID[]);
}

export async function purgeExpiredTrash() {
	const cutoff = Date.now() - TRASH_RETENTION_MS;
	const expiredIds = store.notes
		.filter(note => {
			if (!note.deletedAt) {
				return false;
			}
			const tombstoneTime = note.deletedAt.getTime();
			return tombstoneTime > 0 && tombstoneTime < cutoff;
		})
		.map(expired => expired.id);
	if (expiredIds.length > 0) {
		await permanentlyDeleteMultiple(expiredIds);
	}
	return expiredIds;
}

function addOrUpdate(updatedNote: Note) {
	setStore(draft => {
		const index = draft.notes.findIndex(note => note.id === updatedNote.id);
		switch (index) {
			case -1: {
				draft.notes = draft.notes.concat(updatedNote);
				break;
			}
			default: {
				draft.notes[index] = updatedNote;
				break;
			}
		}
		draft.tags = mergeArrays(draft.tags, updatedNote.tags);
	});
}

export async function replaceNote(updatedNote: Note) {
	addOrUpdate(updatedNote);
	await notesRepository.saveFull(snapshot(updatedNote));
}

export async function replaceMultiple(updatedNotes: Note[]) {
	updatedNotes.forEach(addOrUpdate);
	await notesRepository.saveManyFull(snapshot(updatedNotes));
}

export async function createTag(tag: string) {
	if (!store.tags.includes(tag)) {
		setStore(draft => {
			draft.tags = draft.tags.concat(tag);
		});
	}
	await tagsRepository.save(tag);
}

export async function createTags(tags: string[]) {
	setStore(draft => {
		draft.tags = mergeArrays(draft.tags, tags);
	});
	await tagsRepository.saveMany(tags);
}

export async function deleteTags(tags: string[]) {
	const tagSet = new Set(tags);
	const affectedIds = store.notes.reduce((ids, note) => {
		if (note.tags?.some(tag => tagSet.has(tag))) {
			return ids.concat(note.id);
		}
		return ids;
	}, [] as UUID[]);
	await applyToMany(affectedIds, note => removeTags(note, tags));
	setStore(draft => {
		draft.tags = tags.filter(tag => !tagSet.has(tag));
	});
	await Promise.all(tags.map(tag => tagsRepository.remove(tag)));
	return affectedIds.length;
}