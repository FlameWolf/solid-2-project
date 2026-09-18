import process from "node:process";
import { Buffer } from "node:buffer";
import crypto from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";

const STATE_MAX_AGE = 60 * 10;
const SESSION_MAX_AGE = 60 * 60 * 24 * 400;
const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_REVOKE_URL = "https://oauth2.googleapis.com/revoke";
export const OAUTH_SCOPES = "https://www.googleapis.com/auth/drive.appdata openid email profile";
export const SESSION_COOKIE = "qp_session";
export const STATE_COOKIE = "qp_oauth";

export function clientId(): string {
	return process.env.GOOGLE_OAUTH_CLIENT_ID || process.env.VITE_GOOG_OAUTH_CLIENT_ID || "";
}

export function clientSecret(): string {
	return process.env.GOOGLE_OAUTH_CLIENT_SECRET || "";
}

export function isConfigured(): boolean {
	return Boolean(clientId() && clientSecret() && process.env.SESSION_SECRET);
}

function sessionKey(): Buffer {
	const secret = process.env.SESSION_SECRET || "";
	if (!secret) {
		throw new Error("SESSION_SECRET is not configured");
	}
	return crypto.createHash("sha256").update(secret).digest();
}

function base64urlEncode(buf: Buffer): string {
	return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64urlToBuffer(str: string): Buffer {
	return Buffer.from(str.replace(/-/g, "+").replace(/_/g, "/"), "base64");
}

export type SessionData = {
	rt: string;
	email: string;
	name: string;
};

export function encryptSession(data: SessionData): string {
	const iv = crypto.randomBytes(12);
	const cipher = crypto.createCipheriv("aes-256-gcm", sessionKey(), iv);
	const plaintext = Buffer.from(JSON.stringify(data), "utf8");
	const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
	const tag = cipher.getAuthTag();
	return base64urlEncode(Buffer.concat([iv, tag, ciphertext]));
}

export function decryptSession(token: string | undefined | null): SessionData | null {
	if (!token) {
		return null;
	}
	try {
		const raw = base64urlToBuffer(token);
		const iv = raw.subarray(0, 12);
		const tag = raw.subarray(12, 28);
		const ciphertext = raw.subarray(28);
		const decipher = crypto.createDecipheriv("aes-256-gcm", sessionKey(), iv);
		decipher.setAuthTag(tag);
		const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
		const parsed = JSON.parse(plaintext.toString("utf8"));
		if (parsed && typeof parsed.rt === "string") {
			return { rt: parsed.rt, email: String(parsed.email ?? ""), name: String(parsed.name ?? "") };
		}
		return null;
	} catch {
		return null;
	}
}

export function parseCookies(req: IncomingMessage): Record<string, string> {
	const header = req.headers.cookie;
	const out: Record<string, string> = {};
	if (!header) {
		return out;
	}
	for (const part of header.split(";")) {
		const idx = part.indexOf("=");
		if (idx < 0) {
			continue;
		}
		const key = part.slice(0, idx).trim();
		const value = part.slice(idx + 1).trim();
		if (key) {
			out[key] = decodeURIComponent(value);
		}
	}
	return out;
}

type CookieOptions = {
	maxAge?: number;
	path?: string;
};

function serializeCookie(name: string, value: string, opts: CookieOptions = {}): string {
	const segments = [`${name}=${encodeURIComponent(value)}`, `Path=${opts.path ?? "/"}`];
	if (opts.maxAge !== undefined) {
		segments.push(`Max-Age=${Math.floor(opts.maxAge)}`);
	}
	segments.push("HttpOnly", "Secure", "SameSite=Lax");
	return segments.join("; ");
}

function appendCookie(res: ServerResponse, cookie: string): void {
	const existing = res.getHeader("Set-Cookie");
	if (!existing) {
		res.setHeader("Set-Cookie", cookie);
	} else if (Array.isArray(existing)) {
		res.setHeader("Set-Cookie", existing.concat(cookie));
	} else {
		res.setHeader("Set-Cookie", [String(existing), cookie]);
	}
}

export function setSessionCookie(res: ServerResponse, data: SessionData): void {
	appendCookie(res, serializeCookie(SESSION_COOKIE, encryptSession(data), { maxAge: SESSION_MAX_AGE, path: "/" }));
}

export function clearSessionCookie(res: ServerResponse): void {
	appendCookie(res, serializeCookie(SESSION_COOKIE, "", { maxAge: 0, path: "/" }));
}

export function setStateCookie(res: ServerResponse, state: string): void {
	appendCookie(res, serializeCookie(STATE_COOKIE, state, { maxAge: STATE_MAX_AGE, path: "/api/auth" }));
}

export function clearStateCookie(res: ServerResponse): void {
	appendCookie(res, serializeCookie(STATE_COOKIE, "", { maxAge: 0, path: "/api/auth" }));
}

export function getOrigin(req: IncomingMessage): string {
	const host = req.headers.host;
	const forwarded = req.headers["x-forwarded-proto"];
	const proto = (Array.isArray(forwarded) ? forwarded[0] : forwarded) || "https";
	return `${proto}://${host}`;
}

export function redirectUri(req: IncomingMessage): string {
	return `${getOrigin(req)}/api/auth/callback`;
}

export function buildAuthUrl(req: IncomingMessage, state: string): string {
	const params = new URLSearchParams({
		client_id: clientId(),
		redirect_uri: redirectUri(req),
		response_type: "code",
		scope: OAUTH_SCOPES,
		access_type: "offline",
		prompt: "consent",
		include_granted_scopes: "true",
		state
	});
	return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

export type TokenResponse = {
	access_token?: string;
	expires_in?: number;
	refresh_token?: string;
	id_token?: string;
	scope?: string;
	token_type?: string;
	error?: string;
	error_description?: string;
};

export async function exchangeCode(req: IncomingMessage, code: string): Promise<TokenResponse> {
	const res = await fetch(GOOGLE_TOKEN_URL, {
		method: "POST",
		headers: { "Content-Type": "application/x-www-form-urlencoded" },
		body: new URLSearchParams({
			code,
			client_id: clientId(),
			client_secret: clientSecret(),
			redirect_uri: redirectUri(req),
			grant_type: "authorization_code"
		})
	});
	return (await res.json()) as TokenResponse;
}

export async function refreshAccessToken(refreshToken: string): Promise<TokenResponse> {
	const res = await fetch(GOOGLE_TOKEN_URL, {
		method: "POST",
		headers: { "Content-Type": "application/x-www-form-urlencoded" },
		body: new URLSearchParams({
			client_id: clientId(),
			client_secret: clientSecret(),
			refresh_token: refreshToken,
			grant_type: "refresh_token"
		})
	});
	return (await res.json()) as TokenResponse;
}

export async function revokeToken(token: string): Promise<void> {
	try {
		await fetch(GOOGLE_REVOKE_URL, {
			method: "POST",
			headers: { "Content-Type": "application/x-www-form-urlencoded" },
			body: new URLSearchParams({ token })
		});
	} catch (err) {
		console.warn("Failed to revoke Google token:", err);
	}
}

export function decodeIdToken(idToken: string | undefined): { email: string; name: string } {
	if (!idToken) {
		return { email: "", name: "" };
	}
	try {
		const payload = idToken.split(".")[1];
		if (!payload) {
			return { email: "", name: "" };
		}
		const data = JSON.parse(base64urlToBuffer(payload).toString("utf8"));
		return { email: String(data.email ?? ""), name: String(data.name ?? data.given_name ?? "") };
	} catch {
		return { email: "", name: "" };
	}
}

export function sendJson(res: ServerResponse, status: number, data: unknown): void {
	res.statusCode = status;
	res.setHeader("Content-Type", "application/json; charset=utf-8");
	res.setHeader("Cache-Control", "no-store");
	res.end(JSON.stringify(data));
}