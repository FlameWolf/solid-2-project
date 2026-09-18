import { createMemo, Show } from "solid-js";
import { useLocation } from "@solidjs/router";
import { emptyString } from "@/constants/common";
import { debounce } from "@/utils/timing";
import * as notesStore from "@/stores/notes";
import { listViewRoutes } from "@/router";

export default function SearchBar() {
	let searchInput!: HTMLInputElement;
	const location = useLocation();
	const isSearchMode = createMemo(() => !!notesStore.searchText());
	const debouncedSearch = debounce(() => {
		notesStore.setSearchText(searchInput.value?.trim() ?? emptyString);
	}, 300);

	function clearSearch() {
		debouncedSearch.cancel();
		notesStore.setSearchText(emptyString);
		searchInput.value = emptyString;
	}

	return (
		<div class="me-auto position-relative">
			<input ref={searchInput} type="text" class="form-control pe-5" placeholder="Search" disabled={!listViewRoutes.includes(location.pathname)} onInput={debouncedSearch}/>
			<Show when={isSearchMode()}>
				<button class="btn-close small position-absolute top-50 end-0 translate-middle-y me-2" onClick={clearSearch}></button>
			</Show>
		</div>
	);
}