import { createMemo, onSettled } from "solid-js";
import { activeTheme, applyTheme, Theme, toggleTheme } from "@/composables/useTheme";
import Icon from "@/components/Icon";

export default function ThemeToggle() {
	const isDark = createMemo(() => activeTheme() === Theme.Dark, { sync: true });

	onSettled(() => {
		applyTheme(activeTheme());
	});

	return (
		<button class="btn btn-secondary btn-sm" onClick={toggleTheme} aria-label={`Switch to ${isDark() ? Theme.Light : Theme.Dark} theme`}>
			<Icon type={isDark() ? "moonStarsFill" : "sunFill"}/>
		</button>
	);
}