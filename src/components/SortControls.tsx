import { createMemo, onSettled } from "solid-js";
import { invoke } from "@/utils/common";
import { hydrateSortPrefs, type SortOrder, type SortField } from "@/composables/useNoteSort";
import Icon from "@/components/Icon";

interface Props {
	sortField: SortField;
	sortOrder: SortOrder;
	sortAction: (e: Event) => void;
	toggleAction: () => void;
}

export default function SortControls(props: Props) {
	const isAscending = createMemo(() => props.sortOrder === "asc");

	onSettled(() => {
		invoke(async () => {
			await hydrateSortPrefs();
		});
	});

	return (
		<div class="d-flex gap-1 align-items-center sort-controls">
			<label for="sort-by-select" class="form-label text-muted small mb-0 me-1">
				Sort:
			</label>
			<select id="sort-by-select" class="form-select form-select-sm sort-select" value={props.sortField} onChange={props.sortAction} aria-label="Sort notes by">
				<option value="modifiedAt">Updated</option>
				<option value="createdAt">Created</option>
				<option value="colour">Colour</option>
				<option value="title">Title</option>
				<option value="sentenceCount">Sentences</option>
				<option value="wordCount">Words</option>
				<option value="characterCount">Characters</option>
			</select>
			<button class="btn btn-outline-secondary btn-sm" onClick={props.toggleAction} title={isAscending() ? "Ascending" : "Descending"} aria-label={isAscending() ? "Sort ascending, click to switch to descending" : "Sort descending, click to switch to ascending"}>
				<Icon type={isAscending() ? "sortUp" : "sortDown"}/>
			</button>
		</div>
	);
}