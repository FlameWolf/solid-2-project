import { Show } from "solid-js";
import Icon from "@/components/Icon";
import type { JSX } from "@solidjs/web/jsx-runtime";

interface Props {
	children?: JSX.Element;
	showActions: boolean;
	showCreate: boolean;
	importAction: () => Promise<void>;
}

export default function EmptyState(props: Props) {
	return (
		<div class="empty-state text-center py-5">
			<div class="text-muted mb-3">
				<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" fill="currentColor" viewBox="0 0 16 16">
					<path d="M5 0h8a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2 2 2 0 0 1-2 2H3a2 2 0 0 1-2-2h1a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V4a1 1 0 0 0-1-1H3a1 1 0 0 0-1 1H1a2 2 0 0 1 2-2h8a2 2 0 0 0 2-2V2a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1H3a2 2 0 0 1 2-2z"/>
					<path d="M1 6v-.5a.5.5 0 0 1 1 0V6h.5a.5.5 0 0 1 0 1h-2a.5.5 0 0 1 0-1H1zm0 3v-.5a.5.5 0 0 1 1 0V9h.5a.5.5 0 0 1 0 1h-2a.5.5 0 0 1 0-1H1zm0 3v-.5a.5.5 0 0 1 1 0v.5h.5a.5.5 0 0 1 0 1h-2a.5.5 0 0 1 0-1H1z"/>
				</svg>
			</div>
			<div class="text-muted mb-3">{props.children}</div>
			<Show when={props.showActions}>
				<div class="d-flex flex-column gap-2 align-items-center">
					<Show when={props.showCreate}>
						<div class="d-flex gap-2 justify-content-center flex-wrap">
							<a href="/notes/new" class="btn btn-primary">Create a note</a>
							<button class="btn btn-outline-secondary" onClick={props.importAction}>Import from files</button>
						</div>
					</Show>
					<div class="d-flex gap-3 justify-content-center flex-wrap">
						<a href="/notes/archive" class="btn btn-link btn-sm text-decoration-none">
							<Icon type="archive"/>
							<span class="ms-2">Archived</span>
						</a>
						<a href="/notes/trash" class="btn btn-link btn-sm text-decoration-none">
							<Icon type="trash"/>
							<span class="ms-2">Trash</span>
						</a>
					</div>
				</div>
			</Show>
		</div>
	);
}