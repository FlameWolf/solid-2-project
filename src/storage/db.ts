import { openDB, type IDBPDatabase } from "idb";
import { CONTENTS_STORE, DB_NAME, DB_VERSION, KV_STORE, NOTES_STORE, TAGS_STORE } from "@/constants/storage";
import type { NoteJSON, NoteMetaJSON } from "@/models/Note";

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDB(): Promise<IDBPDatabase> {
	if (!dbPromise) {
		dbPromise = openDB(DB_NAME, DB_VERSION, {
			async upgrade(db, oldVersion, _newVersion, tx) {
				if (!db.objectStoreNames.contains(NOTES_STORE)) {
					db.createObjectStore(NOTES_STORE, { keyPath: "id" });
				}
				if (!db.objectStoreNames.contains(CONTENTS_STORE)) {
					db.createObjectStore(CONTENTS_STORE);
				}
				if (!db.objectStoreNames.contains(KV_STORE)) {
					db.createObjectStore(KV_STORE);
				}
				if (!db.objectStoreNames.contains(TAGS_STORE)) {
					db.createObjectStore(TAGS_STORE);
					await Promise.all([setTag("Ideas"), setTag("Personal"), setTag("Work")]);
				}
				if (oldVersion === 1) {
					const notesStore = tx.objectStore(NOTES_STORE);
					const contentsStore = tx.objectStore(CONTENTS_STORE);
					let cursor = await notesStore.openCursor();
					while (cursor) {
						const { content, ...meta } = cursor.value as NoteJSON;
						if (content !== undefined) {
							await contentsStore.put(content, meta.id);
							await cursor.update(meta);
						}
						cursor = await cursor.continue();
					}
				}
			}
		});
	}
	return dbPromise;
}

export async function getAllNotes(): Promise<NoteMetaJSON[]> {
	const db = await getDB();
	return (await db.getAll(NOTES_STORE)) as NoteMetaJSON[];
}

export async function getNoteContent(id: string): Promise<string | undefined> {
	const db = await getDB();
	return (await db.get(CONTENTS_STORE, id)) as string | undefined;
}

export async function searchContents(match: (content: string) => boolean): Promise<Set<string>> {
	const db = await getDB();
	const matched = new Set<string>();
	const tx = db.transaction(CONTENTS_STORE, "readonly");
	let cursor = await tx.store.openCursor();
	while (cursor) {
		if (match(cursor.value as string)) {
			matched.add(cursor.key as string);
		}
		cursor = await cursor.continue();
	}
	await tx.done;
	return matched;
}

export async function putNote(note: NoteJSON): Promise<void> {
	const db = await getDB();
	const { content, ...meta } = note;
	const tx = db.transaction([NOTES_STORE, CONTENTS_STORE], "readwrite");
	const ops: Promise<unknown>[] = [tx.objectStore(NOTES_STORE).put(meta)];
	if (content !== undefined) {
		ops.push(tx.objectStore(CONTENTS_STORE).put(content, meta.id));
	}
	ops.push(tx.done);
	await Promise.all(ops);
}

export async function putNotes(notes: NoteJSON[]): Promise<void> {
	if (notes.length === 0) {
		return;
	}
	const db = await getDB();
	const tx = db.transaction([NOTES_STORE, CONTENTS_STORE], "readwrite");
	const notesStore = tx.objectStore(NOTES_STORE);
	const contentsStore = tx.objectStore(CONTENTS_STORE);
	const ops: Promise<unknown>[] = [];
	for (const note of notes) {
		const { content, ...meta } = note;
		ops.push(notesStore.put(meta));
		if (content !== undefined) {
			ops.push(contentsStore.put(content, meta.id));
		}
	}
	ops.push(tx.done);
	await Promise.all(ops);
}

export async function putNoteMeta(meta: NoteMetaJSON): Promise<void> {
	const db = await getDB();
	await db.put(NOTES_STORE, meta);
}

export async function putNotesMeta(metas: NoteMetaJSON[]): Promise<void> {
	if (metas.length === 0) {
		return;
	}
	const db = await getDB();
	const tx = db.transaction(NOTES_STORE, "readwrite");
	await Promise.all(metas.map(meta => tx.store.put(meta)).concat(tx.done as Promise<any>));
}

export async function deleteNote(id: string): Promise<void> {
	const db = await getDB();
	const tx = db.transaction([NOTES_STORE, CONTENTS_STORE], "readwrite");
	await Promise.all([tx.objectStore(NOTES_STORE).delete(id), tx.objectStore(CONTENTS_STORE).delete(id), tx.done]);
}

export async function deleteNotes(ids: string[]): Promise<void> {
	if (ids.length === 0) {
		return;
	}
	const db = await getDB();
	const tx = db.transaction([NOTES_STORE, CONTENTS_STORE], "readwrite");
	const notesStore = tx.objectStore(NOTES_STORE);
	const contentsStore = tx.objectStore(CONTENTS_STORE);
	const ops: Promise<unknown>[] = [];
	for (const id of ids) {
		ops.push(notesStore.delete(id));
		ops.push(contentsStore.delete(id));
	}
	ops.push(tx.done);
	await Promise.all(ops);
}

export async function getKV<K extends KVKey>(key: K): Promise<KVSchema[K] | undefined> {
	const db = await getDB();
	return (await db.get(KV_STORE, key)) as KVSchema[K] | undefined;
}

export async function setKV<K extends KVKey>(key: K, value: KVSchema[K]): Promise<void> {
	const db = await getDB();
	await db.put(KV_STORE, value, key);
}

export async function deleteKV(key: KVKey): Promise<void> {
	const db = await getDB();
	await db.delete(KV_STORE, key);
}

export async function setKVRaw(key: string, value: unknown): Promise<void> {
	const db = await getDB();
	await db.put(KV_STORE, value, key);
}

export async function getAllTags(): Promise<string[]> {
	const db = await getDB();
	return await db.getAll(TAGS_STORE);
}

export async function getTag(key: string): Promise<string | undefined> {
	const db = await getDB();
	return await db.get(TAGS_STORE, key.toLowerCase());
}

export async function setTag(value: string): Promise<void> {
	const db = await getDB();
	await db.put(TAGS_STORE, value, value.toLowerCase());
}

export async function deleteTag(key: string): Promise<void> {
	const db = await getDB();
	await db.delete(TAGS_STORE, key.toLowerCase());
}