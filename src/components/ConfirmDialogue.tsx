import { onSettled, onCleanup, Show } from "solid-js";
import { onCancel, onConfirm, state } from "@/composables/useConfirmDialogue";

export default function ConfirmDialogue() {
	const handlers: Record<string, (() => void) | undefined> = {
		Escape: onCancel,
		Enter: onConfirm
	};

	function onKeyDown(e: KeyboardEvent) {
		if (!(e.key in handlers && state.visible)) {
			return;
		}
		e.preventDefault();
		handlers[e.key]?.();
	}

	onSettled(() => {
		window.addEventListener("keydown", onKeyDown);
	});

	onCleanup(() => {
		window.removeEventListener("keydown", onKeyDown);
	});

	return (
		<div
			class="confirm-overlay"
			data-visible={state.visible}
			onClick={e => {
				if (e.target === e.currentTarget) {
					onCancel();
				}
			}}>
			<Show when={state.visible}>
				<div class="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
					<h5 id="confirm-title" class="confirm-title">{state.title}</h5>
					<p class="confirm-message">{state.message}</p>
					<div class="confirm-actions">
						<button type="button" class="btn btn-outline-secondary" onClick={onCancel}>{state.cancelText}</button>
						<button type="button" class={["btn", { [`btn-${state.variant}`]: true }]} onClick={onConfirm} autofocus>{state.confirmText}</button>
					</div>
				</div>
			</Show>
		</div>
	);
}