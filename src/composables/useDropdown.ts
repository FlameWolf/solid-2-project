import { createSignal, onSettled, type Accessor } from "solid-js";

type DropdownOptions = {
	initialState?: boolean;
	autoClose?: boolean;
	dropdown?: Accessor<HTMLElement | undefined>;
};

export function useDropdown(trigger: Accessor<HTMLElement | undefined>, { initialState = false, autoClose = true, dropdown }: DropdownOptions = {}) {
	const [show, setShow] = createSignal(initialState);

	function toggle(force?: boolean) {
		setShow(force ?? !show());
	}

	function clickedOutside(event: MouseEvent) {
		if (!show()) {
			return;
		}
		const path = event.composedPath();
		for (const target of path) {
			if (target === trigger()) {
				return;
			}
			if (!autoClose && target === dropdown?.()) {
				return;
			}
		}
		setShow(false);
	}

	onSettled(() => {
		document.addEventListener("click", clickedOutside);
		return () => {
			document.removeEventListener("click", clickedOutside);
		};
	});

	return {
		show,
		toggle
	};
}