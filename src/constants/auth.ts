import { emptyString } from "@/constants/common";

export const CLIENT_ID = import.meta.env.VITE_GOOG_OAUTH_CLIENT_ID ?? emptyString;
export const SESSION_KEY = "google-session-hint";
export const TOKEN_KEY = "google-access-token";
export const EXPIRY_KEY = "google-token-expires-at";
export const USER_KEY = "google-user-info";
export const TOKEN_REFRESH_BUFFER_MS = 60_000;
export const AUTH_START_URL = "/api/auth/start";
export const AUTH_TOKEN_URL = "/api/auth/token";
export const AUTH_SIGNOUT_URL = "/api/auth/signout";