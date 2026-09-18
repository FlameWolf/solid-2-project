import { createStore } from "solid-js";
import { emptyString } from "@/constants/common";

export type ConfirmVariant = "danger" | "primary" | "warning";
export interface ConfirmOptions {
	title: string;
	message: string;
	confirmText?: string;
	cancelText?: string;
	variant?: ConfirmVariant;
}
export interface ConfirmState {
	visible: boolean;
	title: string;
	message: string;
	confirmText: string;
	cancelText: string;
	variant: ConfirmVariant;
}

let resolver: ((value: boolean) => void) | null = null;
const [params, setParams] = createStore<ConfirmState>({
	visible: false,
	title: emptyString,
	message: emptyString,
	confirmText: "Confirm",
	cancelText: "Cancel",
	variant: "primary"
});
export const state = params;

export function confirm(options: ConfirmOptions): Promise<boolean> {
	return new Promise(resolve => {
		if (resolver) {
			resolver(false);
		}
		setParams(draft => {
			draft.visible = true;
			draft.title = options.title;
			draft.message = options.message;
			draft.confirmText = options.confirmText ?? "Confirm";
			draft.cancelText = options.cancelText ?? "Cancel";
			draft.variant = options.variant ?? "primary";
		});
		resolver = resolve;
	});
}

export function onConfirm() {
	const r = resolver;
	resolver = null;
	setParams(draft => {
		draft.visible = false;
	});
	if (r) {
		r(true);
	}
}

export function onCancel() {
	const r = resolver;
	resolver = null;
	setParams(draft => {
		draft.visible = false;
	});
	if (r) {
		r(false);
	}
}