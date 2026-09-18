import { createEffect, type Accessor, type Setter } from "solid-js";
import { isTextWithin, truncate } from "@/utils/text-analysis";

export function useTruncate(accessor: Accessor<string>, setter: Setter<string>, limit: number) {
	let sender: HTMLInputElement | undefined;

	createEffect(
		accessor,
		content => {
			if (isTextWithin(content, limit)) {
				return;
			}
			if (sender && document.activeElement === sender) {
				const start = sender.selectionStart;
				const end = sender.selectionEnd;
				setter(truncate(content, limit));
				requestAnimationFrame(() => {
					sender!.setSelectionRange(start, end);
				});
			}
		},
		{ defer: true }
	);

	return (el: HTMLInputElement) => (sender = el);
}