import { createMemo, createStore } from "solid-js";
import type { UUID } from "crypto";

interface SelectionState {
	isSelecting: boolean;
	selectedIds: Set<UUID>;
}

const [state, setState] = createStore<SelectionState>({
	isSelecting: false,
	selectedIds: new Set<UUID>()
});
export const isSelecting = createMemo(() => state.isSelecting, { sync: true });
export const selectedIds = createMemo(() => state.selectedIds, { sync: true });
export const selectedCount = createMemo(() => state.selectedIds.size, { sync: true });

export function enterSelectionMode() {
	setState(draft => {
		draft.isSelecting = true;
	});
}

export function exitSelectionMode() {
	setState(draft => {
		draft.selectedIds = new Set<UUID>();
		draft.isSelecting = false;
	});
}

export function toggleSelection(id: UUID) {
	const next = new Set(state.selectedIds);
	if (next.has(id)) {
		next.delete(id);
	} else {
		next.add(id);
	}
	setState(draft => {
		draft.selectedIds = next;
	});
}

export function isSelected(id: UUID): boolean {
	return state.selectedIds.has(id);
}

export function selectAll(ids: UUID[]) {
	setState(draft => {
		draft.selectedIds = new Set(ids);
	});
}

export function clearSelection() {
	setState(draft => {
		draft.selectedIds = new Set<UUID>();
	});
}