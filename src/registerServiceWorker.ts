export function registerServiceWorker() {
	if (!("serviceWorker" in navigator)) {
		return;
	}
	if (!import.meta.env.PROD) {
		return;
	}
	navigator.serviceWorker.register("/sw.js").catch(error => {
		console.error("Service worker registration failed:", error);
	});
}