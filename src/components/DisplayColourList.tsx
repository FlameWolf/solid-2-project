import { For, Show } from "solid-js";
import { colours } from "@/constants/colours";
import * as notesStore from "@/stores/notes";
import Icon from "@/components/Icon";

type Props = {
	filterMode?: boolean;
	selected?: Colour;
	onSelectionChanged?: (colour: Colour) => void;
};

export default function DisplayColourList(props: Props) {
	function isActive(colour: Colour) {
		if (props.filterMode) {
			return notesStore.searchColours().has(colour);
		}
		return props.selected === colour;
	}

	return (
		<div class="d-flex flex-wrap gap-2 p-2 border rounded">
			<For each={colours}>
				{colour => (
					<a class={["colour-circle rounded-circle", { [`bg-${colour}`]: true }]} onClick={() => props.onSelectionChanged?.(colour)} role="button" aria-label={colour}>
						<Show when={isActive(colour)}>
							<Icon type="check2"/>
						</Show>
					</a>
				)}
			</For>
		</div>
	);
}