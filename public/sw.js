const CACHE_VERSION = "__CACHE_VERSION__";
const CACHE_NAME = `quickpad-${CACHE_VERSION}`;
const APP_SHELL = ["__PRECACHE_MANIFEST__"];
const NAVIGATION_FALLBACK = "/index.html";

self.addEventListener("install", event => {
	event.waitUntil(
		caches
			.open(CACHE_NAME)
			.then(cache => cache.addAll(APP_SHELL))
			.then(() => self.skipWaiting())
	);
});

self.addEventListener("activate", event => {
	event.waitUntil(
		caches
			.keys()
			.then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))))
			.then(() => self.clients.claim())
	);
});

self.addEventListener("message", event => {
	if (event.data === "SKIP_WAITING") {
		self.skipWaiting();
	}
});

function isCacheableResponse(response) {
	return response && response.status === 200 && (response.type === "basic" || response.type === "default");
}

function cachePut(cacheKey, response) {
	if (isCacheableResponse(response)) {
		const copy = response.clone();
		caches.open(CACHE_NAME).then(cache => cache.put(cacheKey, copy));
	}
	return response;
}

self.addEventListener("fetch", event => {
	const request = event.request;
	if (request.method !== "GET") {
		return;
	}
	const url = new URL(request.url);
	if (url.origin !== self.location.origin) {
		return;
	}
	if (url.pathname.startsWith("/api/")) {
		return;
	}
	if (request.mode === "navigate") {
		event.respondWith(
			caches.match(NAVIGATION_FALLBACK).then(cached => {
				const networkFetch = fetch(request)
					.then(response => cachePut(NAVIGATION_FALLBACK, response))
					.catch(() => null);
				if (cached) {
					event.waitUntil(networkFetch);
					return cached;
				}
				return networkFetch.then(response => response || caches.match(NAVIGATION_FALLBACK));
			})
		);
		return;
	}
	event.respondWith(
		caches.match(request).then(cached => {
			if (cached) {
				return cached;
			}
			return fetch(request)
				.then(response => cachePut(request, response))
				.catch(() => cached);
		})
	);
});