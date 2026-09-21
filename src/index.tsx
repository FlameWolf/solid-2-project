import { ensurePersistentStorage } from "@/storage/persistence";
import { runMigration } from "@/storage/migrate";
import { registerServiceWorker } from "@/registerServiceWorker";
import { render } from "@solidjs/web";
import { Router } from "@/router";
import App from "@/App";

ensurePersistentStorage().then(success => {
	if (!success) {
		console.warn("Persistent storage request denied. Browser may automatically clear locally saved notes based on storage quotas and eviction criteria.");
	}
});
registerServiceWorker();
await runMigration();
render(() => <Router>{props => <App {...props}/>}</Router>, document.getElementById("root")!);