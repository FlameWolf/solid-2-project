import { createSignal, For, Show } from "solid-js";
import { useDropdown } from "@/composables/useDropdown";
import DisplayColourList from "@/components/DisplayColourList";

interface Props {
	selectedCount: number;
	actions: SelectionAction[];
	showColours?: boolean;
	onAction: (key: SelectionAction["key"]) => void;
	onCancel: () => void;
}

export default function SelectionActionBar(props: Props) {
	const [dropupTrigger, setDropupTrigger] = createSignal<HTMLElement>();
	const dropdown = useDropdown(dropupTrigger);

	function colourSelected(colour: Colour) {
		props.onAction(colour);
	}

	return (
		<div class="selection-action-bar">
			<span class="fw-medium">{props.selectedCount} selected</span>
			<Show when={dropdown.show()}>
				<DisplayColourList onSelectionChanged={colourSelected}/>
			</Show>
			<div class="d-flex gap-2 flex-wrap justify-content-end w-100">
				<Show when={props.showColours}>
					<button ref={setDropupTrigger} class="btn btn-sm btn-outline-primary dropdown-toggle" onClick={() => dropdown.toggle()}>Apply Colour</button>
				</Show>
				<For each={props.actions}>
					{action => (
						<button type="button" class={["btn", { [`btn-sm btn-${action.variant}`]: true }]} onClick={() => props.onAction(action.key)}>{action.label}</button>
					)}
				</For>
				<button type="button" class="btn btn-outline-secondary btn-sm" onClick={props.onCancel}>Cancel</button>
			</div>
		</div>
	);
}