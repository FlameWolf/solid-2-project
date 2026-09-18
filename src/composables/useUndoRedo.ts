import { createSignal, createMemo, type Accessor } from "solid-js";
import { MAX_HISTORY } from "@/constants/notes";

export interface UndoRedo<T> {
	current: Accessor<T>;
	push: (value: T) => void;
	reset: (value: T) => void;
	undo: () => void;
	redo: () => void;
	canUndo: Accessor<boolean>;
	canRedo: Accessor<boolean>;
}

export function useUndoRedo<T>(initial: T): UndoRedo<T> {
	const [current, setCurrent] = createSignal<T>(initial as any);
	const [past, setPast] = createSignal<T[]>([]);
	const [future, setFuture] = createSignal<T[]>([]);
	const canUndo = createMemo(() => past().length > 0, { sync: true });
	const canRedo = createMemo(() => future().length > 0, { sync: true });

	function push(value: T) {
		if (value === current()) {
			return;
		}
		const newPast = past().concat(current());
		if (newPast.length > MAX_HISTORY) {
			newPast.shift();
		}
		setPast(newPast);
		setCurrent(() => value);
		setFuture([]);
	}

	function reset(value: T) {
		setCurrent(() => value);
		setPast([]);
		setFuture([]);
	}

	function undo() {
		const p = past();
		if (p.length === 0) {
			return;
		}
		const prev = p[p.length - 1] as T;
		setFuture(future().concat(current()));
		setPast(p.slice(0, -1));
		setCurrent(() => prev);
	}

	function redo() {
		const f = future();
		if (f.length === 0) {
			return;
		}
		const next = f[f.length - 1] as T;
		setPast(past().concat(current()));
		setFuture(f.slice(0, -1));
		setCurrent(() => next);
	}

	return {
		current,
		canUndo,
		canRedo,
		push,
		reset,
		undo,
		redo
	};
}