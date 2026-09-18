export const DB_NAME = "quick-pad";
export const DB_VERSION = 3;
export const NOTES_STORE = "notes";
export const CONTENTS_STORE = "contents";
export const KV_STORE = "kv";
export const TAGS_STORE = "tags";
export const MIGRATION_FLAG = "__migrated-to-idb";
export const LEGACY_NOTES_KEY = "quick-pad-notes";
export const NOTE_PREFIX = "qp-note:";
export const DRAFT_PREFIX = "qp-draft:";
export const DRAFT_EXPIRY = 60 * 60 * 24 * 30 * 1000;
export const KV_MAPPINGS: ReadonlyArray<readonly [string, string, "string" | "number" | "boolean" | "json"]> = [
	["quick-pad-sort-by", "sort-by", "string"],
	["quick-pad-sort-direction", "sort-direction", "string"],
	["quick-pad-last-synced-to-local", "last-synced-to-local", "string"],
	["quick-pad-last-synced-to-cloud", "last-synced-to-cloud", "string"],
	["quick-pad-auto-sync", "auto-sync", "boolean"],
	["quick-pad-pending-purges", "pending-purges", "json"],
	["google_session_hint", "google-session-hint", "string"],
	["google_access_token", "google-access-token", "string"],
	["google_token_expires_at", "google-token-expires-at", "number"],
	["google_user_info", "google-user-info", "json"]
];