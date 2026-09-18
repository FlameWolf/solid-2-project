import { createEffect, createMemo, createStore, runWithOwner } from "solid-js";
import { emptyString } from "@/constants/common";
import { FONT_SCALE_FACTOR } from "@/constants/ui";
import { getAppOwner } from "@/composables/useAppOwner";

interface AppState {
	lastView: View | null | undefined;
	currentColour: Colour | undefined;
	fontScaleFactor: number;
}

const [store, setStore] = createStore<AppState>({
	lastView: undefined,
	currentColour: undefined,
	fontScaleFactor: getFontScaleFactor()
});
export const lastView = createMemo(() => store.lastView, { sync: true });
export const currentColour = createMemo(() => store.currentColour, { sync: true });
export const fontScaleFactor = createMemo(() => store.fontScaleFactor, { sync: true });

function getFontScaleFactor(): number {
	const factor = parseInt(localStorage.getItem(FONT_SCALE_FACTOR) ?? emptyString);
	if (Number.isNaN(factor)) {
		return 0;
	}
	return factor;
}

export function setLastView(view: View | null | undefined) {
	setStore(draft => {
		draft.lastView = view;
	});
}

export function setCurrentColour(colour: Colour | undefined) {
	setStore(draft => {
		draft.currentColour = colour;
	});
}

export function setFontScaleFactor(factor: number) {
	if (factor < 0 || factor > 10) {
		return;
	}
	setStore(draft => {
		draft.fontScaleFactor = factor;
	});
	if (factor === 0) {
		localStorage.removeItem(FONT_SCALE_FACTOR);
		return;
	}
	localStorage.setItem(FONT_SCALE_FACTOR, factor.toString());
}

runWithOwner(getAppOwner(), () => {
	createEffect(
		() => ({ factor: fontScaleFactor(), colour: currentColour() }),
		({ factor, colour }) => {
			const rootElement = document.documentElement;
			if (factor === 0) {
				rootElement.style.removeProperty("--font-scale-factor");
			} else {
				rootElement.style.setProperty("--font-scale-factor", factor.toString());
			}
			if (colour === undefined) {
				rootElement.style.removeProperty("--bg-colour-base");
			} else {
				rootElement.style.setProperty("--bg-colour-base", colour);
			}
		}
	);
});