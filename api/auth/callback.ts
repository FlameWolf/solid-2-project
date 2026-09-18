import { clearStateCookie, decodeIdToken, exchangeCode, getOrigin, isConfigured, parseCookies, setSessionCookie, STATE_COOKIE } from "../_lib.ts";
import type { IncomingMessage, ServerResponse } from "node:http";

type Profile = {
	email: string;
	name: string;
};

function renderHtml(origin: string, ok: boolean, user: Profile | null, error: string | null): string {
	const payload = JSON.stringify({ type: "qp-auth", ok, user, error });
	const targetOrigin = JSON.stringify(origin);
	return `<!DOCTYPE html>
		<html lang="en">
		<head>
		<meta charset="utf-8"/>
		<title>Signing in...</title>
		</head>
		<body style="margin: 0; font-family: system-ui, sans-serif; background: #0e1c2a; color: #f5f5f5; display: flex; align-items: center; justify-content: center; height: 100vh">
		<p id="msg">Completing sign-in...</p>
		<script>
		(function () {
			var data = ${payload};
			try {
				if (window.opener) {
					window.opener.postMessage(data, ${targetOrigin});
				}
			} catch (e) {}
			document.getElementById("msg").textContent = data.ok
				? "Signed in. You can close this window."
				: ("Sign-in failed" + (data.error ? " (" + data.error + ")" : "") + ". You can close this window.");
			window.close();
		})();
		</script>
		</body>
		</html>`;
}

function send(res: ServerResponse, origin: string, ok: boolean, user: Profile | null, error: string | null): void {
	res.statusCode = 200;
	res.setHeader("Content-Type", "text/html; charset=utf-8");
	res.setHeader("Cache-Control", "no-store");
	res.end(renderHtml(origin, ok, user, error));
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
	const origin = getOrigin(req);
	clearStateCookie(res);
	if (!isConfigured()) {
		send(res, origin, false, null, "server_not_configured");
		return;
	}
	const url = new URL(req.url || "", origin);
	const error = url.searchParams.get("error");
	if (error) {
		send(res, origin, false, null, error);
		return;
	}
	const code = url.searchParams.get("code");
	const state = url.searchParams.get("state");
	const expectedState = parseCookies(req)[STATE_COOKIE];
	if (!code || !state || !expectedState || state !== expectedState) {
		send(res, origin, false, null, "invalid_state");
		return;
	}
	try {
		const tokens = await exchangeCode(req, code);
		if (tokens.error || !tokens.access_token) {
			send(res, origin, false, null, tokens.error || "token_exchange_failed");
			return;
		}
		const profile = decodeIdToken(tokens.id_token);
		if (!tokens.refresh_token) {
			send(res, origin, false, profile.email ? profile : null, "no_refresh_token");
			return;
		}
		setSessionCookie(res, { rt: tokens.refresh_token, email: profile.email, name: profile.name });
		send(res, origin, true, profile, null);
	} catch {
		send(res, origin, false, null, "exchange_error");
	}
}