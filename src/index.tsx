import { createComponent } from "solid-js";
import { render } from "@solidjs/web";
import App from "@/App";

const root = document.getElementById("app");

if (!root) {
	throw new Error('Root element "#app" was not found.');
}

render(() => createComponent(App, {}), root);