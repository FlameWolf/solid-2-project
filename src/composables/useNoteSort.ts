import { createEffect, createMemo, createStore, runWithOwner } from "solid-js";
import { colours } from "@/constants/colours";
import { SORT_FIELDS, SORT_DIRECTIONS, SORT_BY_KEY, SORT_DIRECTION_KEY } from "@/constants/sort";
import { getKV, setKV } from "@/storage/db";
import { getAppOwner } from "@/composables/useAppOwner";
import type { Note } from "@/models/Note";

export type SortField = (typeof SORT_FIELDS)[number];
export type SortOrder = (typeof SORT_DIRECTIONS)[number];
interface SortState {
	sortField: SortField;
	sortOrder: SortOrder;
}

const [state, setState] = createStore<SortState>(
	async draft => {
		const storedBy = await getKV(SORT_BY_KEY);
		if (SORT_FIELDS.includes(storedBy as SortField)) {
			draft.sortField = storedBy as SortField;
		}
		const storedDir = await getKV(SORT_DIRECTION_KEY);
		if (SORT_DIRECTIONS.includes(storedDir as SortOrder)) {
			draft.sortOrder = storedDir as SortOrder;
		}
	},
	{
		sortField: "modifiedAt",
		sortOrder: "desc"
	}
);
export const sortField = createMemo(() => state.sortField, { sync: true });
export const sortOrder = createMemo(() => state.sortOrder, { sync: true });

function getColourValue(name: string | undefined): number {
	if (!name) {
		return 0;
	}
	return colours.indexOf(name as Colour);
}

function compareNotes(a: Note, b: Note, field: SortField): number {
	switch (field) {
		case "title":
			return a.title.localeCompare(b.title, undefined, { sensitivity: "base" });
		case "createdAt":
			return a.createdAt.getTime() - b.createdAt.getTime();
		case "modifiedAt": {
			const aTime = (a.modifiedAt ?? a.createdAt).getTime();
			const bTime = (b.modifiedAt ?? b.createdAt).getTime();
			return aTime - bTime;
		}
		case "colour": {
			const aColour = getColourValue(a.colour);
			const bcolour = getColourValue(b.colour);
			return aColour - bcolour;
		}
		case "sentenceCount":
			return (a.sentenceCount ?? 0) - (b.sentenceCount ?? 0);
		case "wordCount":
			return (a.wordCount ?? 0) - (b.wordCount ?? 0);
		case "characterCount":
			return (a.characterCount ?? 0) - (b.characterCount ?? 0);
	}
}

export function setSortField(field: SortField) {
	setState(draft => {
		draft.sortField = field;
	});
}

export function setSortOrder(order: SortOrder) {
	setState(draft => {
		draft.sortOrder = order;
	});
}

export function toggleSortDirection() {
	setSortOrder(state.sortOrder === "asc" ? "desc" : "asc");
}

export function getSortedNotes(notes: ReadonlyArray<Note>): Note[] {
	const multiplier = state.sortOrder === "asc" ? 1 : -1;
	return notes.toSorted((a, b) => {
		if (a.pinnedAt && !b.pinnedAt) {
			return -1;
		}
		if (b.pinnedAt && !a.pinnedAt) {
			return 1;
		}
		if (a.pinnedAt && b.pinnedAt) {
			return b.pinnedAt.getTime() - a.pinnedAt.getTime();
		}
		return compareNotes(a, b, state.sortField) * multiplier;
	});
}

runWithOwner(getAppOwner(), () => {
	createEffect(
		() => state.sortField,
		field => {
			queueMicrotask(async () => {
				await setKV(SORT_BY_KEY, field);
			});
		},
		{ defer: true }
	);
	createEffect(
		() => state.sortOrder,
		order => {
			queueMicrotask(async () => {
				await setKV(SORT_DIRECTION_KEY, order);
			});
		},
		{ defer: true }
	);
});