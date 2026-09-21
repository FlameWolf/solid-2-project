import { createEffect, createSignal, lazy, onSettled, Show } from "solid-js";
import { createRouter, useBeforeLeave, useLocation, useNavigate } from "@solidjs/router";
import { state as confirmState } from "@/composables/useConfirmDialogue";
import DisplayNoteList from "@/components/DisplayNoteList";
import EditNote from "@/components/EditNote";

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

function Navigate(props: { href: string }) {
	const navigate = useNavigate();

	onSettled(() => {
		navigate(props.href);
	});

	return null;
}

function getBackRoute(path: string) {
	if (listViewRoutes.includes(path)) {
		return path;
	}
	return undefined;
}

export const Router = createRouter({
	routes: [
		{ path: "/", component: () => <Navigate href="/notes"/> },
		{ path: "/favourite", component: () => <Navigate href="/notes/favourite"/> },
		{ path: "/archive", component: () => <Navigate href="/notes/archive"/> },
		{ path: "/trash", component: () => <Navigate href="/notes/trash"/> },
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
		{ path: "/privacy", component: lazy(() => import("../components/PrivacyPolicy")) },
		{ path: "/terms", component: lazy(() => import("../components/TermsOfService")) }
	]
});