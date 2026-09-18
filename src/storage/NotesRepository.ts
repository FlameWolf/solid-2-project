import { fromJSON, toJSON, toMetaJSON, type Note, type NoteMetaJSON } from "@/models/Note";
import * as db from "@/storage/db";
import { tagsRepository } from "@/storage/TagsRepository";
import type { UUID } from "crypto";

class NotesRepository {
	async loadAll(): Promise<Note[]> {
		return (await db.getAllNotes()).map(fromJSON);
	}

	async loadContent(id: UUID): Promise<string | undefined> {
		return await db.getNoteContent(id);
	}

	async search(predicate: (content: string) => boolean): Promise<Set<string>> {
		return await db.searchContents(predicate);
	}

	async saveFull(note: Note): Promise<void> {
		const noteJson = toJSON(note);
		await db.putNote(noteJson);
		note.content = undefined;
		await this.saveTags(noteJson);
	}

	async saveManyFull(notes: Note[]): Promise<void> {
		const noteJsons = notes.map(toJSON);
		await db.putNotes(noteJsons);
		notes.forEach(note => (note.content = undefined));
		noteJsons.forEach(json => delete json.content);
		await this.saveManyTags(noteJsons);
	}

	async getTagsToSave(meta: NoteMetaJSON): Promise<string[]> {
		const tagsToSave: string[] = [];
		if (meta.tags) {
			for (const tag of meta.tags) {
				if (!(await tagsRepository.load(tag))) {
					tagsToSave.push(tag);
				}
			}
		}
		return tagsToSave;
	}

	async saveTags(meta: NoteMetaJSON) {
		if (meta.tags) {
			const tagsToSave = await this.getTagsToSave(meta);
			if (tagsToSave.length) {
				tagsRepository.saveMany(tagsToSave);
			}
		}
	}

	async saveManyTags(metas: NoteMetaJSON[]) {
		const tagsToSave = (await Promise.all(metas.map(this.getTagsToSave))).flat();
		if (tagsToSave.length) {
			tagsRepository.saveMany(tagsToSave);
		}
	}

	async saveMeta(note: Note): Promise<void> {
		const meta = toMetaJSON(note);
		await db.putNoteMeta(meta);
		await this.saveTags(meta);
	}

	async saveManyMeta(notes: Note[]): Promise<void> {
		const metas = notes.map(toMetaJSON);
		await db.putNotesMeta(metas);
		await this.saveManyTags(metas);
	}

	async remove(id: UUID): Promise<void> {
		await db.deleteNote(id);
	}

	async removeMany(ids: UUID[]): Promise<void> {
		await db.deleteNotes(ids);
	}
}

export const notesRepository = new NotesRepository();