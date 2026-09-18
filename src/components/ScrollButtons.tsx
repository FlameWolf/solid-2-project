import Icon from "@/components/Icon";

function scrollToPosition(position: "top" | "bottom") {
	const element = document.documentElement;
	element.scrollTo({
		top: position === "top" ? 0 : element.scrollHeight,
		behavior: "smooth"
	});
}

export default function ScrollButtons() {
	return (
		<div class="d-flex flex-column gap-1 position-fixed bottom-0 end-0 opacity-75 mb-2 me-2">
			<button class="btn btn-secondary btn-sm" onClick={() => scrollToPosition("top")}>
				<Icon type="chevronUp"/>
			</button>
			<button class="btn btn-secondary btn-sm" onClick={() => scrollToPosition("bottom")}>
				<Icon type="chevronDown"/>
			</button>
		</div>
	);
}