import { createComponent } from "solid-js";
import { render } from "@solidjs/web";
import App from "@/App";

const root = document.getElementById("root");

if (!root) {
	throw new Error(`Root element "#root" was not found.`);
}

render(() => createComponent(App, {}), root);