import { createSignal } from "solid-js";

export enum Theme {
	Dark = "dark",
	Light = "light"
}

const [theme, setTheme] = createSignal(
	(() => {
		const savedTheme = localStorage.getItem("theme");
		if (savedTheme === Theme.Dark || savedTheme === Theme.Light) {
			return savedTheme;
		}
		return window.matchMedia("(prefers-color-scheme: dark)").matches ? Theme.Dark : Theme.Light;
	})()
);
export const activeTheme = theme;

export function applyTheme(newTheme: Theme): void {
	setTheme(newTheme);
	document.documentElement.setAttribute("data-bs-theme", newTheme);
	localStorage.setItem("theme", newTheme);
}

export function toggleTheme(): void {
	applyTheme(theme() === Theme.Dark ? Theme.Light : Theme.Dark);
}