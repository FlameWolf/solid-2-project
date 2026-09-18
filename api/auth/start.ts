import crypto from "node:crypto";
import { buildAuthUrl, isConfigured, setStateCookie } from "../_lib.ts";
import type { IncomingMessage, ServerResponse } from "node:http";

export default function handler(req: IncomingMessage, res: ServerResponse) {
	if (!isConfigured()) {
		res.statusCode = 500;
		res.setHeader("Content-Type", "text/plain; charset=utf-8");
		res.end("Google sign-in is not configured on the server.");
		return;
	}
	const state = crypto.randomBytes(32).toString("base64url");
	setStateCookie(res, state);
	res.statusCode = 302;
	res.setHeader("Cache-Control", "no-store");
	res.setHeader("Location", buildAuthUrl(req, state));
	res.end();
}