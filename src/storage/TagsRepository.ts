import { contains } from "@/utils/text-analysis";
import * as db from "@/storage/db";

class TagsRepository {
	async loadAll(): Promise<string[]> {
		return await db.getAllTags();
	}

	async search(text: string): Promise<string[]> {
		return (await db.getAllTags()).filter(tag => contains(tag, text));
	}

	async load(tag: string): Promise<string | undefined> {
		return await db.getTag(tag);
	}

	async save(tag: string): Promise<void> {
		await db.setTag(tag);
	}

	async saveMany(tags: string[]): Promise<void> {
		await Promise.all(tags.map(this.save));
	}

	async remove(tag: string): Promise<void> {
		await db.deleteTag(tag);
	}

	async removeMany(tags: string[]): Promise<void> {
		await Promise.all(tags.map(this.remove));
	}
}

export const tagsRepository = new TagsRepository();