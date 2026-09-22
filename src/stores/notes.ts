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
	isSearching: boolean;
}

const [store, setStore] = createStore<NotesState>(
	async draft => {
		try {
			draft.notes = await notesRepository.loadAll();
			draft.tags = mergeArrays(
				draft.notes.reduce((tags, note) => {
					if (note.tags) {
						return tags.concat(note.tags);
					}
					return tags;
				}, [] as string[]),
				await tagsRepository.loadAll()
			);
		} catch (err) {
			console.error("Failed to load notes from storage", err);
		}
	},
	{
		notes: [],
		tags: [],
		searchText: emptyString,
		searchColours: new Set<string>(),
		searchTags: new Set<string>(),
		tagFilter: "any",
		isSearching: false
	}
);
const [contentMatchedIds, setContentMatchedIds] = createSignal(new Set<UUID>());
export const notes = () => store.notes;
export const tags = () => store.tags;
export const searchText = createMemo(() => store.searchText, { sync: true });
export const searchColours = createMemo(() => store.searchColours, { sync: true });
export const searchTags = createMemo(() => store.searchTags, { sync: true });
export const tagFilter = createMemo(() => store.tagFilter, { sync: true });
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

export async function updateNote(id: UUID, title: string, content: string) {
	await new Promise<void>(resolve => {
		setStore(draft => {
			const note = draft.notes.find(note => note.id === id);
			if (!note) {
				return resolve();
			}
			update(note, title, content);
			draft.tags = mergeArrays(draft.tags, note.tags);
			invoke(async () => {
				await notesRepository.saveFull(snapshot(note));
				resolve();
			});
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
	await new Promise<void>(resolve => {
		setStore(draft => {
			const note = draft.notes.find(note => note.id === id);
			if (!note) {
				return resolve();
			}
			mutator(note);
			invoke(async () => {
				await notesRepository.saveMeta(snapshot(note));
				resolve();
			});
		});
	});
}

async function applyToMany(ids: ReadonlyArray<UUID>, mutator: (note: Note) => void) {
	await new Promise<void>(resolve => {
		const idSet = new Set<UUID>(ids);
		setStore(draft => {
			const targetNotes = draft.notes.filter(note => idSet.has(note.id));
			targetNotes.forEach(mutator);
			invoke(async () => {
				await notesRepository.saveManyMeta(snapshot(targetNotes));
				resolve();
			});
		});
	});
}

export async function faveNote(id: UUID) {
	await applyToNote(id, fave);
}

export async function faveMultiple(ids: ReadonlyArray<UUID>) {
	await applyToMany(ids, fave);
}

export async function unfaveNote(id: UUID) {
	await applyToNote(id, unfave);
}

export async function unfaveMultiple(ids: ReadonlyArray<UUID>) {
	await applyToMany(ids, unfave);
}

export async function pinNote(id: UUID) {
	await applyToNote(id, pin);
}

export async function unpinNote(id: UUID) {
	await applyToNote(id, unpin);
}

export async function archiveNote(id: UUID) {
	await applyToNote(id, archive);
}

export async function archiveMultiple(ids: ReadonlyArray<UUID>) {
	await applyToMany(ids, archive);
}

export async function unarchiveNote(id: UUID) {
	await applyToNote(id, unarchive);
}

export async function unarchiveMultiple(ids: ReadonlyArray<UUID>) {
	await applyToMany(ids, unarchive);
}

export async function trashNote(id: UUID) {
	await applyToNote(id, trash);
}

export async function trashMultiple(ids: ReadonlyArray<UUID>) {
	await applyToMany(ids, trash);
}

export async function restoreFromTrash(id: UUID) {
	await applyToNote(id, restore);
}

export async function restoreFromTrashMultiple(ids: ReadonlyArray<UUID>) {
	await applyToMany(ids, restore);
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
	await new Promise<void>(resolve => {
		const index = store.notes.findIndex(note => note.id === id);
		if (index === -1) {
			return resolve();
		}
		setStore(draft => {
			draft.notes = draft.notes.toSpliced(index, 1);
		});
		invoke(async () => {
			await notesRepository.remove(id);
			resolve();
		});
	});
}

export async function permanentlyDeleteMultiple(ids: ReadonlyArray<UUID>) {
	await new Promise<void>(resolve => {
		const idSet = new Set<UUID>(ids);
		setStore(draft => {
			draft.notes = draft.notes.filter(note => !idSet.has(note.id));
		});
		invoke(async () => {
			await notesRepository.removeMany(ids as UUID[]);
			resolve();
		});
	});
}

export async function purgeExpiredTrash() {
	return await new Promise<UUID[]>(resolve => {
		const cutoff = Date.now() - TRASH_RETENTION_MS;
		const expiredIds = store.notes.reduce((ids, note) => {
			if (note.deletedAt) {
				const tombstoneTime = note.deletedAt.getTime();
				if (tombstoneTime < cutoff) {
					return ids.concat(note.id);
				}
			}
			return ids;
		}, [] as UUID[]);
		if (expiredIds.length > 0) {
			invoke(async () => {
				permanentlyDeleteMultiple(expiredIds);
				resolve(expiredIds);
			});
		}
	});
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
	await new Promise<void>(resolve => {
		addOrUpdate(updatedNote);
		invoke(async () => {
			await notesRepository.saveFull(snapshot(updatedNote));
			resolve();
		});
	});
}

export async function replaceMultiple(updatedNotes: Note[]) {
	await new Promise<void>(resolve => {
		updatedNotes.forEach(addOrUpdate);
		invoke(async () => {
			await notesRepository.saveManyFull(snapshot(updatedNotes));
			resolve();
		});
	});
}

export async function createTag(tag: string) {
	await new Promise<void>(resolve => {
		if (!store.tags.includes(tag)) {
			setStore(draft => {
				draft.tags = draft.tags.concat(tag);
			});
		}
		invoke(async () => {
			await tagsRepository.save(tag);
			resolve();
		});
	});
}

export async function createTags(tags: string[]) {
	await new Promise<void>(resolve => {
		setStore(draft => {
			draft.tags = mergeArrays(draft.tags, tags);
		});
		invoke(async () => {
			await tagsRepository.saveMany(tags);
			resolve();
		});
	});
}

export async function deleteTags(tags: string[]) {
	return await new Promise<number>(async resolve => {
		const tagSet = new Set(tags);
		const affectedIds = store.notes.reduce((ids, note) => {
			if (note.tags?.some(tag => tagSet.has(tag))) {
				return ids.concat(note.id);
			}
			return ids;
		}, [] as UUID[]);
		await applyToMany(affectedIds, note => removeTags(note, tags));
		setStore(draft => {
			draft.tags = draft.tags.filter(tag => !tagSet.has(tag));
		});
		invoke(async () => {
			await Promise.all(tags.map(tag => tagsRepository.remove(tag)));
			resolve(affectedIds.length);
		});
	});
}