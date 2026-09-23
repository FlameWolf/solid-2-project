import { createEffect, createMemo, createSignal, createStore, runWithOwner, snapshot } from "solid-js";
import { TOKEN_KEY, EXPIRY_KEY, USER_KEY, CLIENT_ID, SESSION_KEY, TOKEN_REFRESH_BUFFER_MS, AUTH_TOKEN_URL, AUTH_START_URL, AUTH_SIGNOUT_URL } from "@/constants/auth";
import { LAST_SYNCED_TO_CLOUD_KEY, LAST_SYNCED_TO_LOCAL_KEY } from "@/constants/sync";
import { deleteKV, getKV, setKV } from "@/storage/db";
import { getAppOwner } from "@/composables/useAppOwner";

type UserInfo = {
	email: string;
	name: string;
};
interface AuthState {
	isReady: boolean;
	isSignedIn: boolean;
	user: UserInfo | null;
}

let cachedToken: string | null = null;
let cachedExpiry: number = 0;
let cachedUser: UserInfo | null = null;
let refreshInFlight: Promise<string> | null = null;
const [state, setState] = createStore<AuthState>(
	async draft => {
		cachedToken = (await getKV(TOKEN_KEY)) ?? null;
		cachedExpiry = (await getKV(EXPIRY_KEY)) ?? 0;
		const stored = await getKV(USER_KEY);
		if (stored && typeof stored.email === "string" && typeof stored.name === "string") {
			cachedUser = { email: stored.email, name: stored.name };
		} else {
			cachedUser = null;
		}
	},
	{
		isReady: false,
		isSignedIn: false,
		user: null
	}
);
const [accessToken, setAccessToken] = createSignal<string | null>(null);
const [tokenExpiresAt, setTokenExpiresAt] = createSignal(0);
export const isConfigured = !!CLIENT_ID;
export const isReady = createMemo(() => state.isReady, { sync: true });
export const isSignedIn = createMemo(() => state.isSignedIn, { sync: true });
export const user = createMemo(() => state.user, { sync: true });

async function clearSession(keepUser = false) {
	setAccessToken(null);
	setTokenExpiresAt(0);
	cachedToken = null;
	cachedExpiry = 0;
	if (!keepUser) {
		setState(draft => {
			draft.user = null;
			draft.isSignedIn = false;
		});
		cachedUser = null;
		await deleteKV(SESSION_KEY);
		await deleteKV(LAST_SYNCED_TO_CLOUD_KEY);
		await deleteKV(LAST_SYNCED_TO_LOCAL_KEY);
	}
}

async function refreshFromServer(): Promise<string> {
	if (refreshInFlight) {
		return refreshInFlight;
	}
	refreshInFlight = (async () => {
		try {
			const res = await fetch(AUTH_TOKEN_URL, {
				method: "GET",
				credentials: "include",
				headers: { Accept: "application/json" }
			});
			if (res.status === 401) {
				await clearSession(false);
				throw new Error("Your Google session has expired. Please sign in again.");
			}
			if (!res.ok) {
				throw new Error(`Could not refresh the Google session (status ${res.status}).`);
			}
			const data = (await res.json()) as { access_token: string; expires_in: number; user?: UserInfo | null };
			setAccessToken(data.access_token);
			setTokenExpiresAt(Date.now() + (data.expires_in || 3600) * 1000);
			if (data.user) {
				setState(draft => {
					draft.user = data.user!;
				});
			}
			await setKV(SESSION_KEY, true);
			setState(draft => {
				draft.isSignedIn = true;
			});
			return data.access_token;
		} finally {
			refreshInFlight = null;
		}
	})();
	return refreshInFlight;
}

export async function getAccessToken(): Promise<string> {
	const token = accessToken();
	if (token && Date.now() < tokenExpiresAt() - TOKEN_REFRESH_BUFFER_MS) {
		return token;
	}
	return refreshFromServer();
}

export function tryRestoreSession() {
	if (state.isReady) {
		return;
	}
	if (!CLIENT_ID) {
		setState(draft => {
			draft.isReady = true;
		});
		return;
	}
	if (cachedToken && cachedExpiry && Date.now() < cachedExpiry - TOKEN_REFRESH_BUFFER_MS) {
		setAccessToken(cachedToken);
		setTokenExpiresAt(cachedExpiry);
		setState(draft => {
			draft.user = cachedUser;
			draft.isSignedIn = true;
		});
	} else if (cachedUser) {
		setState(draft => {
			draft.user = cachedUser;
			draft.isSignedIn = true;
		});
	}
	setState(draft => {
		draft.isReady = true;
	});
}

export function signIn(): Promise<void> {
	if (!CLIENT_ID) {
		return Promise.resolve();
	}
	return new Promise<void>(resolve => {
		const width = 500;
		const height = 600;
		const left = window.screenX + Math.max(0, Math.round((window.outerWidth - width) / 2));
		const top = window.screenY + Math.max(0, Math.round((window.outerHeight - height) / 2));
		const popup = window.open(AUTH_START_URL, "qp-google-auth", `width=${width},height=${height},left=${left},top=${top}`);
		let settled = false;
		let pollTimer: ReturnType<typeof setInterval> | null = null;
		function cleanup() {
			window.removeEventListener("message", onMessage);
			if (pollTimer) {
				clearInterval(pollTimer);
				pollTimer = null;
			}
		}
		function finish() {
			if (settled) {
				return;
			}
			settled = true;
			cleanup();
			resolve();
		}
		async function onMessage(event: MessageEvent) {
			if (event.origin !== window.location.origin || !event.data || event.data.type !== "qp-auth") {
				return;
			}
			if (event.data.ok) {
				if (event.data.user) {
					setState(draft => {
						draft.user = event.data.user;
					});
				}
				await setKV(SESSION_KEY, true);
				setState(draft => {
					draft.isSignedIn = true;
				});
				try {
					await refreshFromServer();
				} catch (err) {
					console.warn("Failed to refresh access token after sign-in", err);
				}
			}
			finish();
		}
		window.addEventListener("message", onMessage);
		if (!popup) {
			console.warn("Sign-in popup was blocked by the browser.");
			finish();
			return;
		}
		pollTimer = setInterval(() => {
			if (popup.closed) {
				finish();
			}
		}, 500);
	});
}

export async function signOut() {
	try {
		await fetch(AUTH_SIGNOUT_URL, { method: "POST", credentials: "include" });
	} catch (err) {
		console.warn("Failed to notify the server of sign-out", err);
	}
	await clearSession();
}

runWithOwner(getAppOwner(), () => {
	createEffect(
		() => ({ token: accessToken(), expiresAt: tokenExpiresAt() }),
		({ token, expiresAt }) => {
			queueMicrotask(async () => {
				if (!token || !expiresAt) {
					await deleteKV(TOKEN_KEY);
					await deleteKV(EXPIRY_KEY);
					return;
				}
				if (token !== cachedToken || expiresAt !== cachedExpiry) {
					await setKV(TOKEN_KEY, token);
					await setKV(EXPIRY_KEY, expiresAt);
				}
			});
		},
		{ defer: true }
	);
	createEffect(
		() => state.user,
		info => {
			queueMicrotask(async () => {
				if (!info) {
					await deleteKV(USER_KEY);
					return;
				}
				if (info && (info.email !== cachedUser?.email || info.name !== cachedUser?.name)) {
					await setKV(USER_KEY, snapshot(info));
				}
			});
		},
		{ defer: true }
	);
});