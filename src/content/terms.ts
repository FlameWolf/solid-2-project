export const termsEffectiveDate = "12 June 2026";
export const termsIntro = [`These Terms of Service ("Terms") govern your use of QuickPad, a simple, fast, offline-first plain-text note-taking web app. Please read them carefully. They explain what QuickPad does, what you can expect from it, and what you are responsible for when you use it.`, `QuickPad is free to use. You do not need an account to take notes, and signing in is entirely optional. By using QuickPad, you agree to these Terms. These Terms address how QuickPad handles data at a high level; for full details of what data is collected and processed, see the "Privacy and data handling" section below and our Privacy Policy.`].join("\n\n");
export const termsSections: LegalSection[] = [
	{
		heading: "1. Acceptance of these Terms and eligibility",
		blocks: [
			{ type: "paragraph", text: "By accessing or using QuickPad, you agree to be bound by these Terms. If you do not agree with any part of them, please do not use the app. If you use QuickPad on behalf of someone else, you confirm that you are authorized to accept these Terms on their behalf." },
			{ type: "paragraph", text: "You must be old enough to form a binding contract in your jurisdiction to use QuickPad. If you are not, you may use QuickPad only with the involvement and consent of a parent or legal guardian who agrees to these Terms on your behalf." }
		]
	},
	{
		heading: "2. What QuickPad is",
		blocks: [
			{ type: "paragraph", text: "QuickPad is a free web app for creating and managing plain-text notes. It is designed to be offline-first and local-first: your notes live in your own browser on your device, and the app works without an Internet connection after your first visit. Key characteristics of the service include:" },
			{
				type: "list",
				items: ["It is free. There is no payment, pricing tier, or subscription.", "It handles plain-text notes only. It does not support rich media, and unsupported or non-text files are rejected on import. Notes can be exported as plain .txt files.", "Your notes are stored locally on your device in your browser (in an IndexedDB database named quick-pad). There is no server-side storage of your notes for local use.", "It is installable as a Progressive Web App and continues to work offline once its app shell has been cached by a service worker (in production builds).", "Google Drive sync is an optional feature that is fully off unless you choose to turn it on by signing in with Google."]
			}
		]
	},
	{
		heading: "3. No account required; optional Google sign-in",
		blocks: [
			{ type: "paragraph", text: "You do not need to create an account, register, or log in to create and store notes locally. QuickPad works entirely on your device without any sign-in, and if Google sign-in is unavailable or you have not enabled it, QuickPad runs entirely on your device. If you never sign in, your notes are not transmitted off your device by QuickPad." },
			{ type: "paragraph", text: "If you want to back up and synchronize your notes across devices, you may optionally sign in with Google. Signing in requests access to a private application-data folder in your own Google Drive and to your basic Google profile (your email address and name). It is used only to provide optional Google Drive sync and to keep you signed in; it is never used for tracking or advertising." },
			{ type: "paragraph", text: `When you sign in, more than your notes is involved. QuickPad's serverless backend receives an authentication token (a Google refresh token) and your Google account email and display name. These are decoded from the identity token Google returns and are stored in an encrypted, server-side session cookie so that you can stay signed in; short-lived access tokens are then obtained on your behalf. Your email, name, access token, and token expiry are also cached locally in your browser. The details of what is collected, where it is stored, and how long it is kept are described in the "Privacy and data handling" section below and in our Privacy Policy.` },
			{ type: "paragraph", text: "When you sign in, QuickPad stores your notes only in a hidden application-data folder in your own Google Drive that is private to QuickPad. The app cannot see or access any of your other Google Drive files." }
		]
	},
	{
		heading: "4. Your content and acceptable use",
		blocks: [
			{ type: "paragraph", text: "You are solely responsible for the notes and other content you create, import, or store using QuickPad. By using the app, you agree to the following:" },
			{
				type: "list",
				items: ["You own your content and are responsible for it. QuickPad stores the notes you author and the plain-text files you import or export; it does not review, curate, or moderate your content.", "Keep your own backups. Because your notes are stored locally on your device, you are responsible for maintaining your own copies of anything important to you.", "You are responsible for your Google account. If you choose to sign in for Drive sync, you are responsible for that Google account and for keeping its credentials and security under your control. Your use of Google services is also subject to Google's own terms."]
			},
			{ type: "paragraph", text: "You agree to use QuickPad only for lawful purposes. In particular, you agree not to use QuickPad to create, store, import, export, or synchronize content that:" },
			{
				type: "list",
				items: ["is unlawful, or that infringes or misappropriates the intellectual property, privacy, or other rights of others;", "contains malware, malicious code, or anything designed to disrupt, damage, or gain unauthorized access to any system or data;", "you do not have the right to store or process; or", "violates applicable laws or regulations."]
			},
			{ type: "paragraph", text: "You also agree not to misuse, interfere with, or attempt to disrupt the app, its hosting infrastructure, or the third-party services it relies on, and not to attempt to circumvent the access restrictions described in these Terms." }
		]
	},
	{
		heading: "5. Data loss and no guarantee of availability",
		blocks: [
			{ type: "paragraph", text: "Because QuickPad is local-first and free, you should understand how your data can be lost and that the service is provided without any guarantee of availability or that your data will be preserved. In particular:" },
			{
				type: "list",
				items: ["Clearing your browser's site data will permanently remove all notes that have not been synced to Google Drive. The app cannot recover notes once your browser's local data has been cleared.", "Deleted notes are moved to Trash rather than removed immediately. Trashed notes are eligible for permanent deletion after 30 days and are purged automatically when the app next runs its cleanup, which removes both their metadata and their content. For a synced account this purge also propagates to your Google Drive app-data folder.", "Sync is best-effort. Optional Google Drive sync depends on Google's services, your Google account, and network conditions, and may fail, be delayed, or be incomplete. After a change, an automatic upload is briefly delayed (debounced) before it is sent. Sync resolves differences using a last-write-wins approach based on note timestamps, so a newer copy can overwrite an older one.", "QuickPad does not guarantee that the service, or any synced copy of your data, will be available, uninterrupted, error-free, or retained. You should not rely on QuickPad as your only copy of important information."]
			}
		]
	},
	{
		heading: "6. Privacy and data handling",
		blocks: [
			{ type: "paragraph", text: "This section summarizes how QuickPad handles data. Our Privacy Policy provides further detail, and these Terms should be read together with it." },
			{ type: "paragraph", text: "Local storage. By default, all of your notes and preferences are stored only on your device, in an IndexedDB database named quick-pad. No account is required, and no notes are sent to any server when you use QuickPad locally. QuickPad reads from your browser's older localStorage only once, to migrate any data from older versions of the app into IndexedDB, after which those legacy entries are removed; localStorage is not used for ongoing storage or tracking." },
			{ type: "paragraph", text: "Contacting Google when the page loads. QuickPad loads Google's Identity Services script from accounts.google.com on every page load (and includes a DNS-prefetch hint to the same Google origin). This means your browser contacts Google's servers when you open the app, even before you sign in. This script supports the optional Google sign-in feature." },
			{ type: "paragraph", text: "Data collected when you sign in with Google. If you choose to sign in, QuickPad requests the drive.appdata, openid, email, and profile scopes. As a result:" },
			{
				type: "list",
				items: ["Your Google account email address and display name are read from the identity token Google returns and are stored, together with a Google refresh token, inside an encrypted, server-side session cookie named qp_session. That cookie is set with the HttpOnly, Secure, and SameSite=Lax attributes and has a long lifetime (a maximum age of approximately 400 days). The refresh token is kept only on the server side and is not exposed to your browser in plaintext.", "A short-lived OAuth state cookie (named qp_oauth) is also set briefly during the sign-in flow for security (to protect against cross-site request forgery) and is cleared shortly afterward.", "Your email, name, a short-lived Google access token, and that token's expiry are also cached locally in your browser's IndexedDB so that you stay signed in. Sync timestamps and sync preferences are likewise stored locally."]
			},
			{ type: "paragraph", text: "What is sent to Google Drive on sync. When sync is enabled and running, each note is uploaded to your private Google Drive app-data folder as its own JSON file. The uploaded file contains the full note, including its title, full body text, all timestamps, the note's randomly generated identifier, and derived metadata (a short summary made from the first part of the content, along with sentence, word, and character counts). All Drive requests are authorized only with a short-lived access token; no other credentials are sent to Google's Drive API. Deleting a note (including emptying Trash) also deletes the corresponding file from your Drive app-data folder." },
			{ type: "paragraph", text: "No analytics, tracking, or advertising. QuickPad contains no analytics, telemetry, tracking, advertising, session-replay, or tracking-pixel code, and sets no tracking or analytics cookies. The only cookies it uses are the server-side OAuth session and OAuth-state cookies described above, which exist solely to support optional Google sign-in. At runtime, the only external services the app contacts are Google (for the optional sign-in and Drive sync features) and QuickPad's own first-party backend used for the sign-in flow." },
			{ type: "paragraph", text: "Signing out and deleting your data. You can sign out at any time from within the app. Signing out revokes QuickPad's Google access grant with Google, clears the server-side session, and clears the locally cached access token, user information, and sync metadata. You can remove your locally stored notes and data by deleting them in the app or by clearing your browser's site data, and you can remove synced copies by deleting the relevant notes (which propagates the deletion to your Drive app-data folder) or by managing QuickPad's access and app data through your Google account." }
		]
	},
	{
		heading: "7. Third-party services",
		blocks: [
			{ type: "paragraph", text: "QuickPad relies on certain third-party services, which are operated by others and governed by their own terms and policies:" },
			{
				type: "list",
				items: ["Google Drive and Google sign-in. If you choose to sign in and enable sync, your notes are stored in your own Google Drive and authentication is handled through Google. Your use of these features is subject to Google's terms of service and policies, and QuickPad has no control over Google's services or how Google handles your account.", "Vercel hosting. QuickPad is hosted and deployed on Vercel, which serves the static app and the serverless functions used for the optional sign-in flow. The encrypted server-side session cookie described above is handled by these serverless functions."]
			},
			{ type: "paragraph", text: "QuickPad is not responsible for the availability, performance, terms, or actions of these third-party services." }
		]
	},
	{
		heading: "8. Intellectual property",
		blocks: [
			{ type: "paragraph", text: "You retain all rights to the notes and content you create with QuickPad. We do not claim ownership of your content, and using QuickPad does not transfer any rights in your content to us." },
			{ type: "paragraph", text: "QuickPad's software, name, and design remain the property of the project's author(s). No license to the QuickPad software is granted to you except as expressly stated. Your rights are limited to using the service as provided, and nothing in these Terms grants you any other rights in the QuickPad software or brand." }
		]
	},
	{
		heading: `9. Disclaimer of warranties ("AS IS")`,
		blocks: [{ type: "paragraph", text: `QuickPad is provided "AS IS" and "AS AVAILABLE," without warranties of any kind, whether express or implied. To the fullest extent permitted by law, we disclaim all warranties, including any implied warranties of merchantability, fitness for a particular purpose, and non-infringement. We do not warrant that the service will be uninterrupted, secure, error-free, or that any data will be preserved or recoverable.` }]
	},
	{
		heading: "10. Limitation of liability",
		blocks: [
			{ type: "paragraph", text: "To the fullest extent permitted by law, QuickPad and the people behind it will not be liable for any indirect, incidental, special, consequential, or punitive damages, or for any loss of data, loss of notes, or loss of use, arising out of or related to your use of (or inability to use) the service, even if advised of the possibility of such damages. Because QuickPad is provided free of charge, you use it at your own risk." },
			{ type: "paragraph", text: "In any case, and to the fullest extent permitted by law, our total aggregate liability for all claims relating to QuickPad will not exceed the amount you paid to use it, which is zero. Some jurisdictions do not allow the exclusion or limitation of certain damages, so some of the above limitations may not apply to you." }
		]
	},
	{
		heading: "11. Termination and suspension",
		blocks: [
			{ type: "paragraph", text: "You may stop using QuickPad at any time. If you have signed in with Google, you can sign out to revoke QuickPad's access to your Google account, and you can delete your locally stored data by clearing your browser's site data and your synced data through your Google account, as described in the \"Privacy and data handling\" section." },
			{ type: "paragraph", text: "Because QuickPad is a free, local-first app with no accounts, the maintainers do not generally manage individual users. However, to the extent the maintainers operate any hosted or backend components, they may suspend or restrict access to those components, or to QuickPad as a whole, for any user who misuses the service, violates these Terms, or creates security, legal, or operational risk, at any time and without notice. This is in addition to the maintainers' right to change or discontinue the service described below." }
		]
	},
	{
		heading: "12. Changes to the service and these Terms",
		blocks: [{ type: "paragraph", text: "QuickPad may be changed, updated, suspended, or discontinued at any time, in whole or in part, without notice. These Terms may also be updated from time to time. When we make changes, we will update the date shown on this page. For material changes, we will make reasonable efforts to highlight them on this page or within the app where practicable; because QuickPad does not maintain user accounts or contact details, we cannot notify users individually, so we encourage you to review these Terms periodically. Your continued use of QuickPad after changes take effect means you accept the revised Terms." }]
	},
	{
		heading: "13. Governing law",
		blocks: [
			{ type: "paragraph", text: "These Terms are governed by the laws of the Republic of India, without regard to its conflict-of-laws rules, and any disputes arising from these Terms or your use of QuickPad will be subject to the courts located in the Republic of India." },
			{ type: "paragraph", text: "Nothing in this section limits any mandatory consumer-protection rights you may have under the laws of your country or place of residence, which continue to apply to you regardless of the governing law chosen above." }
		]
	},
	{
		heading: "14. General",
		blocks: [
			{
				type: "list",
				items: ["Entire agreement. These Terms (together with our Privacy Policy) constitute the entire agreement between you and QuickPad regarding the service and supersede any prior understandings on that subject.", "Severability. If any provision of these Terms is found to be invalid or unenforceable, that provision will be limited or removed to the minimum extent necessary, and the remaining provisions will remain in full force and effect.", "No waiver. Our failure to enforce any provision of these Terms is not a waiver of our right to do so later.", "Assignment. You may not transfer or assign your rights or obligations under these Terms. We may assign or transfer our rights and obligations under these Terms, for example in connection with a change in the project's maintainership."]
			}
		]
	},
	{
		heading: "15. Contact",
		blocks: [{ type: "paragraph", text: "If you have questions about these Terms or about QuickPad, please reach out through the project's source code repository, where you can find more information and open an issue." }]
	}
];