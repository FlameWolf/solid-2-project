import { clearSessionCookie, decryptSession, isConfigured, parseCookies, refreshAccessToken, sendJson, SESSION_COOKIE, setSessionCookie, type TokenResponse } from "../_lib.ts";
import type { IncomingMessage, ServerResponse } from "node:http";

export default async function handler(req: IncomingMessage, res: ServerResponse) {
	if (!isConfigured()) {
		sendJson(res, 500, { error: "server_not_configured" });
		return;
	}
	const session = decryptSession(parseCookies(req)[SESSION_COOKIE]);
	if (!session) {
		sendJson(res, 401, { error: "no_session" });
		return;
	}
	let tokens: TokenResponse;
	try {
		tokens = await refreshAccessToken(session.rt);
	} catch {
		sendJson(res, 502, { error: "upstream_error" });
		return;
	}
	if (tokens.error || !tokens.access_token) {
		clearSessionCookie(res);
		sendJson(res, 401, { error: tokens.error || "refresh_failed" });
		return;
	}
	setSessionCookie(res, { rt: tokens.refresh_token || session.rt, email: session.email, name: session.name });
	sendJson(res, 200, {
		access_token: tokens.access_token,
		expires_in: tokens.expires_in ?? 3600,
		user: session.email ? { email: session.email, name: session.name } : null
	});
}