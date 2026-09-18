import { createEffect, createSignal, lazy, Show } from "solid-js";
import { useBeforeLeave, useLocation } from "@solidjs/router";
import { state as confirmState } from "@/composables/useConfirmDialogue";
import DisplayNoteList from "@/components/DisplayNoteList";
import EditNote from "@/components/EditNote";
import { createRouter } from "@solidjs/router";

export const listViewRoutes = ["/notes", "/notes/favourite", "/notes/archive", "/notes/trash"];
const scrollPositions = new Map<string, number>();

export function RouteTransition() {
	const location = useLocation();
	const [isNavigating, setIsNavigating] = createSignal(false);

	useBeforeLeave(event => {
		const fromPath = location.pathname;
		if (listViewRoutes.includes(fromPath)) {
			scrollPositions.set(fromPath, globalThis.scrollY);
		}
		if (!event.defaultPrevented) {
			setIsNavigating(true);
		}
	});

	createEffect(
		() => confirmState.visible,
		visible => {
			if (visible && isNavigating()) {
				setIsNavigating(false);
			}
		}
	);

	createEffect(
		() => location.pathname,
		toPath => {
			const scrollTop = (listViewRoutes.includes(toPath) && scrollPositions.get(toPath)) || 0;
			setTimeout(() => {
				window.scrollTo({
					top: scrollTop,
					behavior: "instant"
				});
			});
			setIsNavigating(false);
		}
	);

	return (
		<Show when={isNavigating()}>
			<div class="nav-overlay"></div>
		</Show>
	);
}

function getBackRoute(path: string) {
	if (listViewRoutes.includes(path)) {
		return path;
	}
	return undefined;
}

export const Router = createRouter({
	routes: [
		{ path: "/", redirect: "/notes" },
		{ path: "/favourite", redirect: "/notes/favourite" },
		{ path: "/archive", redirect: "/notes/archive" },
		{ path: "/trash", redirect: "/notes/trash" },
		{
			path: "/notes",
			component: () => <DisplayNoteList view="active"/>
		},
		{
			path: "/notes/favourite",
			component: () => <DisplayNoteList view="favourited"/>
		},
		{
			path: "/notes/archive",
			component: () => <DisplayNoteList view="archived"/>
		},
		{
			path: "/notes/trash",
			component: () => <DisplayNoteList view="trash"/>
		},
		{ path: "/notes/new", component: () => <EditNote/> },
		{
			path: "/notes/:id",
			component: () => <EditNote backRoute={getBackRoute(location.pathname)}/>
		},
		{ path: "/privacy", component: () => import("../components/PrivacyPolicy") },
		{ path: "/terms", component: () => import("../components/TermsOfService") }
	]
});