import { clearSessionCookie, decryptSession, parseCookies, revokeToken, sendJson, SESSION_COOKIE } from "../_lib.ts";
import type { IncomingMessage, ServerResponse } from "node:http";

export default async function handler(req: IncomingMessage, res: ServerResponse) {
	const session = decryptSession(parseCookies(req)[SESSION_COOKIE]);
	if (session?.rt) {
		await revokeToken(session.rt);
	}
	clearSessionCookie(res);
	sendJson(res, 200, { ok: true });
}