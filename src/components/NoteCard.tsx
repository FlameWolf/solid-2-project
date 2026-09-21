import { createMemo, For, Show } from "solid-js";
import { emptyString } from "@/constants/common";
import * as notesStore from "@/stores/notes";
import Icon from "@/components/Icon";
import type { Note } from "@/models/Note";
import type { UUID } from "node:crypto";

interface Props {
	note: Note;
	selectionMode: boolean;
	selected: boolean;
	clickAction: (e: MouseEvent, id: UUID) => void;
}

function formatDate(date?: Date): string {
	if (!date) {
		return emptyString;
	}
	return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function NoteCard(props: Props) {
	const note = createMemo(() => props.note, { sync: true });
	const colourClass = createMemo(() => (note().colour ? { [`bg-${note().colour}`]: true } : {}), { sync: true });
	const isSelectionMode = createMemo(() => props.selectionMode, { sync: true });
	const isSelected = createMemo(() => props.selected, { sync: true });

	function addToSearchTags(tag: string) {
		if (props.selectionMode) {
			return;
		}
		notesStore.addSearchTag(tag);
	}

	return (
		<a href={`/notes/${note().id}`} class={["card note-card text-decoration-none position-relative", { ...colourClass(), selected: isSelectionMode() && isSelected() }]} onClick={e => props.clickAction(e, note().id)}>
			<Show when={note().pinnedAt || note().favedAt}>
				<div class="d-flex gap-2 small position-absolute top-0 p-2 status-badge">
					<Show when={note().pinnedAt}>
						<Icon type="pinAngleFill"/>
					</Show>
					<Show when={note().favedAt}>
						<Icon type="starFill"/>
					</Show>
				</div>
			</Show>
			<div class="card-body d-flex flex-column">
				<Show when={props.selectionMode}>
					<input type="checkbox" class="form-check-input selection-checkbox rounded-circle" checked={isSelected()}/>
				</Show>
				<div class="d-flex gap-1 mb-2">
					<div class="text-truncate">{note().title}</div>
					<div class="badge align-self-center border ms-auto">{formatDate(note().modifiedAt ?? note().createdAt)}</div>
				</div>
				<p class="card-text small overflow-hidden">{note().summary}</p>
			</div>
			<div class="bg-body small w-100 position-absolute bottom-0">
				<Show when={note().tags}>
					<div class="d-flex gap-1 px-2 py-2">
						<For each={note().tags}>
							{tag => (
								<a
									class="badge text-bg-secondary"
									role="button"
									onClick={e => {
										e.preventDefault();
										addToSearchTags(tag);
									}}>#{tag}</a>
							)}
						</For>
					</div>
				</Show>
				<div class="d-flex gap-1 small px-2 py-2 border-top">
					<Show when={note().sentenceCount}>
						<div class="badge text-bg-secondary">{note().sentenceCount} sentences</div>
					</Show>
					<Show when={note().wordCount}>
						<div class="badge text-bg-secondary">{note().wordCount} words</div>
					</Show>
					<Show when={note().characterCount}>
						<div class="badge text-bg-secondary">{note().characterCount} characters</div>
					</Show>
				</div>
			</div>
		</a>
	);
}