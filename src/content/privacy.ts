export const privacyEffectiveDate = "12 June 2026";
export const privacyIntro = ["QuickPad is a simple, fast, offline-first plain-text note-taking app that runs entirely in your browser. By design, your notes live on your own device, you do not need an account to use the app, and there is no analytics, advertising, or tracking of any kind. This policy explains exactly what data QuickPad stores, where it lives, and what happens only if you choose to turn on the optional Google Drive sync.", "In short: everything works locally and offline by default. Nothing about your notes leaves your device unless you sign in with Google and sync (automatically or manually), in which case your notes are stored in a private application folder in your own Google Drive. If you do sign in, QuickPad stores your Google account name and email; these are personal data and are covered by the same retention and deletion controls described below."].join("\n\n");
export const privacySections: LegalSection[] = [
	{
		heading: "What QuickPad Is",
		blocks: [
			{ type: "paragraph", text: "QuickPad is a free, installable Progressive Web App for taking plain-text notes. It works without an Internet connection, and it stores only plain text — it does not handle rich media. You can create, view, search, edit, archive, and delete notes, and you can import plain-text files and export notes as .txt files. No account or registration is required to use the app." },
			{ type: "paragraph", text: "QuickPad is local-first. All of your notes and preferences are kept in your browser on your device, and the app loads and functions offline after your first visit. The optional Google Drive sync is the only feature that sends any note data off your device, and it is fully off unless you choose to sign in with Google." },
			{ type: "paragraph", text: "QuickPad is a free, open-source project and is provided as-is, without warranties of any kind. It is offered by the project's maintainer rather than by a formal company. How to get in touch about privacy matters is described in the Contact section below." }
		]
	},
	{
		heading: "Data Stored Locally on Your Device",
		blocks: [
			{ type: "paragraph", text: `Your data is stored locally in your browser in an IndexedDB database named "quick-pad". There is no server-side storage of your notes for local use. No account, login, or authentication is required to create and store notes. The data stored locally includes:` },
			{
				type: "list",
				items: ["Your note titles and the full body text of each note.", "Per-note metadata, including a randomly generated UUID id (not derived from your identity or content), a 100-character text summary (the first 100 characters of the content), sentence, word, and character counts, and timestamps (created, modified, archived, deleted, and state-changed).", "Your preferences, such as your sort field, sort direction, an auto-sync on/off flag, and a list of pending purges.", "If you use Google sync: sync timestamps (last synced to local and to cloud), a cached short-lived Google access token and its expiry, a Google session hint, and your cached Google user info (your name and email)."]
			},
			{ type: "paragraph", text: "If you used an older version of QuickPad that stored data in your browser's localStorage, the app performs a one-time migration of that data into the IndexedDB database on first run and then removes the old localStorage entries. After that, localStorage is not used for ongoing storage or tracking." }
		]
	},
	{
		heading: "Optional Google Drive Sync",
		blocks: [
			{ type: "paragraph", text: "Google Drive sync is optional and is completely off unless you sign in with Google. Note data is sent to Google only when you are signed in and a sync runs — either automatic sync (when you have it enabled) or a sync you trigger manually. If you are not signed in, nothing leaves your device. Turning off automatic sync stops background uploads, but you can still sync manually while signed in." },
			{ type: "paragraph", text: "When sync runs, each note is stored in your Google Drive as its own JSON file named qp-note:<note-id>.json. These files are kept exclusively in Drive's hidden application data folder (appDataFolder), which is private to QuickPad. QuickPad cannot see or access any other files in your Google Drive." },
			{ type: "paragraph", text: "During sync, the full note is uploaded to and stored on Google Drive. This includes:" },
			{
				type: "list",
				items: ["The note title and the entire note body/content.", "All timestamps (created, modified, archived, deleted, and state-changed).", "The note id (UUID).", "Derived metadata: the 100-character summary, and the sentence, word, and character counts."]
			},
			{ type: "paragraph", text: "Sync is two-way and resolves conflicts using a last-write-wins approach based on the most recent note timestamp. Automatic uploads are coalesced with a short (3 second) delay after a change. Drive read, query, download, and delete operations use the Google Drive REST API at <code>https://www.googleapis.com/drive/v3/files</code>, and uploads use <code>https://www.googleapis.com/upload/drive/v3/files</code>. These are Google-operated servers. Only a short-lived OAuth access token is sent with each Drive request; no other credentials are transmitted to the Drive API." },
			{ type: "paragraph", text: "When you permanently delete a note, the corresponding qp-note:<id>.json file is deleted from Google Drive. Trashed notes that pass the 30-day retention window are purged from Drive during sync, and notes you explicitly purge are deleted from Drive as well." },
			{ type: "paragraph", text: "Because Google Drive is operated by Google, the notes you sync are processed and stored on Google's servers, which may be located in countries other than your own. How Google handles that data is governed by Google's own privacy policy and terms; see the Data Location, Hosting, and Third-Party Processing section below." }
		]
	},
	{
		heading: "Google Permissions (OAuth Scopes)",
		blocks: [
			{ type: "paragraph", text: "If you choose to sign in, QuickPad requests only a limited set of Google permissions:" },
			{
				type: "list",
				items: ["drive.appdata — access only to QuickPad's hidden application-data folder in your Drive. This is why the app cannot see or touch the rest of your Drive files.", "openid, email, and profile — to identify you (your name and email address) for sign-in and sync."]
			},
			{ type: "paragraph", text: "QuickPad uses the OAuth 2.0 authorization-code flow with offline access. Short-lived access tokens are normally refreshed silently on the server without re-prompting you. Occasionally you may be asked to sign in again — for example, if you revoke QuickPad's access from your Google account, or if Google's servers return an error when refreshing — in which case the app clears the session and prompts you to sign in once more." }
		]
	},
	{
		heading: "Authentication and Cookies",
		blocks: [
			{ type: "paragraph", text: "QuickPad uses cookies only for sign-in and sync. They are functional cookies, not tracking cookies. The app's client code never sets cookies in your browser, and there are no advertising or analytics cookies. The two cookies are:" },
			{
				type: "list",
				items: ["qp_session — an encrypted session cookie set after you sign in with Google. It holds your Google refresh token along with your email and name, encrypted with AES-256-GCM. It is set with the HttpOnly, Secure, and SameSite=Lax attributes, with a Path of / and a maximum lifetime of about 400 days. The refresh token is stored only inside this encrypted, HttpOnly cookie. Your browser stores the cookie but cannot read its contents, and the token is decrypted only on the server.", "qp_oauth — a short-lived CSRF protection cookie set just before redirecting you to Google. It holds a random value, is scoped to the /api/auth path, carries the HttpOnly, Secure, and SameSite=Lax attributes, and expires after 10 minutes. It is checked when you return from Google and then cleared."]
			},
			{ type: "paragraph", text: "The authorization code returned by Google is exchanged for tokens on the server. The application's client secret stays on the server and never reaches your browser. Your email and name are read from Google's identity (id_token) and stored in the encrypted server-side session cookie, and are also cached locally on your device (as described above) to keep you signed in. Note that QuickPad reads your email and name from Google's identity token without independently verifying the token's cryptographic signature; it relies on the secure, server-to-server connection with Google for the integrity of that token." }
		]
	},
	{
		heading: "Third-Party Services and Network Calls",
		blocks: [
			{ type: "paragraph", text: "QuickPad keeps third-party involvement to a minimum:" },
			{
				type: "list",
				items: ["Google — contacted only for the optional Drive sync and for sign-in. On your device, the app talks to Google's Drive v3 file endpoints. On QuickPad's server side, the backend contacts Google's OAuth endpoints for authorization (<code>https://accounts.google.com/o/oauth2/v2/auth</code>), token exchange and refresh (<code>https://oauth2.googleapis.com/token</code>), and token revocation on sign-out (<code>https://oauth2.googleapis.com/revoke</code>). Note data is sent to Google only when you sign in and a sync runs.", "Vercel — the hosting platform that serves the app and runs the small serverless functions used for the Google sign-in, token, and sign-out flow.", "Google Identity Services — the page loads Google's sign-in client script from <code>https://accounts.google.com/gsi/client</code> (with a DNS-prefetch hint to the same Google origin), so your browser contacts Google's servers when loading the page. This is the only third-party script the page loads."]
			},
			{ type: "paragraph", text: "At runtime, the only outbound network calls from your device are to Google (for optional Drive sync and sign-in) and to QuickPad's own first-party backend for the token and sign-out flow. Bundled libraries are included in the build rather than loaded from any CDN. The service worker that enables offline use caches only same-origin app files; it never caches Google requests or the authentication backend." }
		]
	},
	{
		heading: "Data Location, Hosting, and Third-Party Processing",
		blocks: [
			{ type: "paragraph", text: "QuickPad itself does not run its own database of your notes. However, two third parties may process data on their own infrastructure, which may be located outside your country:" },
			{
				type: "list",
				items: [`Google — if you sign in and sync, your notes and your Google account name and email are processed and stored on Google\'s servers. Google\'s handling of this data is governed by Google\'s own privacy policy (<a target="_blank" href="https://policies.google.com/privacy">https://policies.google.com/privacy</a>) and terms (<a target="_blank" href="https://policies.google.com/terms">https://policies.google.com/terms</a>). We encourage you to review them to understand how Google processes the data you sync.`, `Vercel — QuickPad is hosted on Vercel as a single project comprising the static app plus the serverless functions in /api/auth. When your browser requests the page or calls those auth functions (sign-in, token refresh, sign-out), Vercel necessarily receives the request and, like most hosting platforms, may record standard server request logs that can include your IP address, user agent, and timestamps. QuickPad does not add its own analytics or logging on top of this. Vercel\'s data practices are described in Vercel\'s privacy policy (<a target="_blank" href="https://vercel.com/legal/privacy-policy">https://vercel.com/legal/privacy-policy</a>).`]
			},
			{ type: "paragraph", text: "In other words, while your notes are stored locally by default, choosing to sign in and sync means routing data to Google, and using the deployed web app means your network requests reach the host (Vercel). Both may process that data in other countries." }
		]
	},
	{
		heading: "No Analytics, Advertising, or Selling of Data",
		blocks: [{ type: "paragraph", text: "QuickPad contains no analytics, telemetry, tracking pixels, advertising, or session-replay code of any kind. It does not profile you, and it does not sell, rent, or share your data with anyone for advertising or marketing. The only data that ever leaves your device is the note data you choose to sync to your own Google Drive, plus the standard request metadata your browser sends to the host and to Google as described above." }]
	},
	{
		heading: "Your Rights and Controls",
		blocks: [
			{ type: "paragraph", text: "Because QuickPad stores your notes on your own device and (optionally) in your own Google Drive, you have direct control over your data and can exercise the rights commonly described in privacy laws such as the GDPR and CCPA without needing to ask us:" },
			{
				type: "list",
				items: ["Access and portability — your notes are on your device. You can read them at any time and export any note as a plain .txt file to obtain a copy of your data.", "Rectification — you can edit any note directly in the app.", "Erasure — you can delete notes (see Data Retention and Deletion below), permanently purge them, clear the app's local data from your browser, and sign out to revoke Google access and remove synced files.", "Withdrawing consent — Google sign-in and sync are entirely optional. You can stop syncing by turning off automatic sync, and you can disconnect entirely by signing out."]
			},
			{ type: "paragraph", text: "For data held by Google or Vercel on their own systems, you can also exercise rights directly with them under their respective privacy policies. If you have a privacy request that the in-app controls do not cover, you can contact the maintainer as described in the Contact section." }
		]
	},
	{
		heading: "Data Retention and Deletion",
		blocks: [
			{ type: "paragraph", text: "You stay in control of your data:" },
			{
				type: "list",
				items: ["Deleting a note moves it to Trash. Trashed notes are kept for 30 days and then automatically purged on app start. Permanently deleting a note removes both its metadata and its content from local storage, and (if you use sync) deletes the corresponding file from your Google Drive.", "Signing out revokes QuickPad's Google access grant on Google's servers and clears the encrypted server-side session cookie (qp_session). Your locally cached access token, user info, and sync metadata are also cleared.", "To delete the data stored locally, clear the site data for QuickPad in your browser. This removes the local IndexedDB database. Note that clearing site data will remove all notes that have not been synced to Drive, so back up anything you want to keep."]
			},
			{ type: "paragraph", text: "Important: clearing your browser's site data alone does not disconnect you from Google. It removes only the local cache on your device. The server-side encrypted session cookie and Google's authorization can persist (the session cookie lasts up to about 400 days), and the Google refresh token is revoked only when you explicitly use Sign Out. To fully revoke QuickPad's access to your Google account and invalidate the server-side session, use Sign Out. You can also revoke QuickPad's access at any time from your Google Account security settings (<a target=\"_blank\" href=\"https://myaccount.google.com/permissions\">https://myaccount.google.com/permissions</a>)." },
			{ type: "paragraph", text: "Because your notes are stored locally and (optionally) in your own Google Drive, you are responsible for your own content and backups. Data lost by clearing site data or by the automatic trash purge cannot be recovered by us." }
		]
	},
	{
		heading: "Security and Its Limits",
		blocks: [
			{ type: "paragraph", text: "QuickPad takes reasonable measures to protect the small amount of data it handles. The Google refresh token is held only in an AES-256-GCM-encrypted, HttpOnly session cookie that your browser cannot read; the OAuth client secret stays on the server; cookies are set with the Secure and SameSite=Lax attributes; and a CSRF state check protects the sign-in flow. Sync uses Google's own servers over HTTPS, and only a short-lived access token is sent with each request." },
			{ type: "paragraph", text: "However, no method of transmission or storage is completely secure, and we cannot guarantee absolute security. The protection of your synced data also depends on the security of your Google account and your device, and on the hosting platform. If the server's session-encryption secret or the hosting environment were ever compromised, the confidentiality of the encrypted session cookies could be affected; signing out and revoking access from your Google account remains the most reliable way to cut off access. As noted above, identity details are read from Google's id_token without independent signature verification, relying instead on the secure server-to-server channel with Google. Please use the app with these limitations in mind." }
		]
	},
	{
		heading: "Children",
		blocks: [{ type: "paragraph", text: "QuickPad is a general-purpose note-taking tool and is not directed at children. It does not require an account for local use and does not knowingly collect personal information for local use. We do not set a separate minimum age for using the local app, but if you choose to sign in with Google, you must be old enough to hold and use a Google account under Google's terms and the laws of your country. If you are below the minimum age required to consent to data processing in your jurisdiction, please do not use the Google sign-in feature." }]
	},
	{
		heading: "Local-Only Mode",
		blocks: [{ type: "paragraph", text: "If no Google client ID is configured for the deployment you are using, the sign-in and sync features are hidden and QuickPad runs entirely local-only and offline. In that case, no cookies are set, no Google permissions are requested, and no note data, sign-in request, or authentication call is made. Please note one exception: the page still includes Google's sign-in client script (<code>https://accounts.google.com/gsi/client</code>), so your browser may still contact Google's servers to load that script when the page loads, even though sign-in and sync are disabled. No note data or account data is sent in this contact. See the Third-Party Services and Network Calls section for details." }]
	},
	{
		heading: "Changes to This Policy",
		blocks: [{ type: "paragraph", text: "We may update this policy from time to time, for example to reflect changes in the app. When we do, we will revise the effective date shown at the top of this page. Significant changes will be reflected here, so please check back periodically." }]
	},
	{
		heading: "Contact",
		blocks: [{ type: "paragraph", text: "QuickPad is maintained as a free, open-source project by its repository maintainer, who acts as the data controller for the limited personal data described here. If you have questions about this policy or a privacy request, the primary channel is to open an issue or discussion in the project's public repository. If you would prefer not to use a public channel for a privacy-related request, you can reach the maintainer privately through the contact details listed on the maintainer's repository profile." }]
	}
];