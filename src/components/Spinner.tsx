import { dynamic } from "@solidjs/web";
import { Show, createMemo, createStore } from "solid-js";

type Props = {
	message?: string;
	minimal?: boolean;
	showMessage?: boolean;
	tag?: string;
};

export default function Spinner(props: Props) {
	const showMessage = createMemo(() => props.showMessage ?? true, { sync: true });
	const [wrapperElem] = createStore({ value: dynamic(() => props.tag ?? "div") });

	return (
		<Show when={!props.minimal} fallback={<wrapperElem.value class="spinner-border spinner-border-sm" role="status"></wrapperElem.value>}>
			<div class={["d-flex flex-column justify-content-center align-items-center", { "py-3": !showMessage() }]}>
				<div class="spinner-border" aria-hidden="true" aria-label={showMessage() ? undefined : props.message}/>
				<Show when={showMessage()}>
					<div class="mt-3" role="status">{props.message ?? "Loading..."}</div>
				</Show>
			</div>
		</Show>
	);
}