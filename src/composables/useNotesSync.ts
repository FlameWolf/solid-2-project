import { createEffect, createMemo, createSignal, createStore, runWithOwner } from "solid-js";
import { emptyString } from "@/constants/common";
import { NOTE_PREFIX } from "@/constants/storage";
import { LAST_SYNCED_TO_LOCAL_KEY, LAST_SYNCED_TO_CLOUD_KEY, AUTO_SYNC_KEY, DEBOUNCE_MS } from "@/constants/sync";
import { getTime } from "@/utils/dates";
import { debounce } from "@/utils/timing";
import { fromJSON, toJSON, type Note, type NoteJSON } from "@/models/Note";
import { deleteKV, getKV, setKV } from "@/storage/db";
import * as notesStore from "@/stores/notes";
import { addNotification } from "@/stores/notifications";
import { getAppOwner } from "@/composables/useAppOwner";
import { isSignedIn } from "@/composables/useGoogleAuth";
import { deleteFile, findFile, listFiles, readJSONById, writeJSON, writeJSONById } from "@/composables/useGoogleDrive";
import type { UUID } from "crypto";

interface SyncState {
	isSyncing: boolean;
	autoSyncEnabled: boolean;
	syncError: string | null;
}
enum NoteUploadResult {
	Uploaded = "uploaded",
	Conflict = "conflict"
}
enum NoteChangeOrigin {
	Local = "local",
	Remote = "remote",
	Neither = "neither"
}

const [state, setState] = createStore<SyncState>(
	async draft => {
		const storedAutoSync = await getKV(AUTO_SYNC_KEY);
		draft.autoSyncEnabled = storedAutoSync === undefined ? true : storedAutoSync;
	},
	{
		isSyncing: false,
		autoSyncEnabled: true,
		syncError: null
	}
);
const [lastSyncedToLocalAt, setLastSyncedToLocalAt] = createSignal(async () => {
	const storedLocal = await getKV(LAST_SYNCED_TO_LOCAL_KEY);
	return storedLocal ? new Date(storedLocal) : null;
});
const [lastSyncedToCloudAt, setLastSyncedToCloudAt] = createSignal(async () => {
	const storedCloud = await getKV(LAST_SYNCED_TO_CLOUD_KEY);
	return storedCloud ? new Date(storedCloud) : null;
});
const pendingPurges = new Set<UUID>();
const debouncedFlush = debounce(() => {
	if (isSignedIn() && state.autoSyncEnabled) {
		saveToCloud()
			.then(() => {
				addNotification("success", "Synced to cloud");
			})
			.catch(() => {
				addNotification("danger", "Sync failed");
			});
	}
}, DEBOUNCE_MS);
export const isSyncing = createMemo(() => state.isSyncing, { sync: true });
export const autoSyncEnabled = createMemo(() => state.autoSyncEnabled, { sync: true });
export const syncError = createMemo(() => state.syncError, { sync: true });
export const lastSyncedAt = createMemo(
	() => {
		const max = Math.max(getTime(lastSyncedToLocalAt()), getTime(lastSyncedToCloudAt()));
		return max > 0 ? new Date(max) : null;
	},
	{ sync: true }
);
export const requestSync = Object.assign(
	function (purged: ReadonlyArray<UUID> = []) {
		if (purged.length > 0) {
			purged.forEach(Set.prototype.add, pendingPurges);
		}
		debouncedFlush();
	},
	{
		cancel() {
			debouncedFlush.cancel();
		}
	}
);

function getFileName(id: UUID) {
	return `${NOTE_PREFIX}${id}.json`;
}

function noteEffectiveTime(note: Note): number {
	return Math.max(note.createdAt.getTime(), getTime(note.modifiedAt), getTime(note.favedAt), getTime(note.pinnedAt), getTime(note.archivedAt), getTime(note.deletedAt), getTime(note.stateChangedAt));
}

function revisionSource(remote: Note, local: Note): NoteChangeOrigin {
	const remoteEffectiveTime = noteEffectiveTime(remote);
	const localEffectiveTime = noteEffectiveTime(local);
	if (remoteEffectiveTime > localEffectiveTime) {
		return NoteChangeOrigin.Remote;
	}
	if (localEffectiveTime > remoteEffectiveTime) {
		return NoteChangeOrigin.Local;
	}
	return NoteChangeOrigin.Neither;
}

function mergeNotesByModifiedAt(local: ReadonlyArray<Note>, remote: ReadonlyArray<Note>): Note[] {
	const localMap = new Map<string, Note>(local.map(note => [note.id, note]));
	const changes: Note[] = [];
	for (const remoteNote of remote) {
		const localNote = localMap.get(remoteNote.id);
		if (!localNote || revisionSource(remoteNote, localNote) === NoteChangeOrigin.Remote) {
			changes.push(remoteNote);
		}
	}
	return changes;
}

async function readRemoteNotes(force = false, token?: string): Promise<{ token: string | undefined; notes: Note[] }> {
	const { pageToken, fileList } = await listFiles(NOTE_PREFIX, force ? null : lastSyncedToLocalAt(), token);
	const notes: Note[] = [];
	await Promise.all(
		fileList.map(async file => {
			try {
				const data = await readJSONById<NoteJSON>(file.id);
				if (data) {
					notes.push(fromJSON(data));
				}
			} catch (err) {
				console.warn(`Failed to read note file ${file.name}:`, err);
			}
		})
	);
	return { token: pageToken, notes };
}

async function purgeRemoteFiles(fileIdsToPurge: ReadonlyArray<UUID>) {
	fileIdsToPurge.forEach(Set.prototype.add, pendingPurges);
	if (pendingPurges.size > 0) {
		const purgeSnapshot = Array.from(pendingPurges);
		await Promise.all(purgeSnapshot.map(getFileName).map(deleteFile));
		purgeSnapshot.forEach(Set.prototype.delete, pendingPurges);
	}
}

async function buildUploadPayload(note: Note): Promise<NoteJSON> {
	const content = await notesStore.getNoteContent(note.id);
	return Object.assign(toJSON(note), {
		content: content ?? emptyString
	});
}

async function uploadNote(note: Note): Promise<NoteUploadResult> {
	const fileName = getFileName(note.id);
	const remoteFile = await findFile(fileName);
	if (remoteFile) {
		const remoteJSON = await readJSONById<NoteJSON>(remoteFile.id);
		if (remoteJSON) {
			const remoteNote = fromJSON(remoteJSON);
			switch (revisionSource(remoteNote, note)) {
				case NoteChangeOrigin.Remote: {
					await notesStore.replaceNote(remoteNote);
					return NoteUploadResult.Conflict;
				}
				case NoteChangeOrigin.Local: {
					await writeJSONById(remoteFile.id, await buildUploadPayload(note));
					return NoteUploadResult.Uploaded;
				}
				default: {
					break;
				}
			}
		}
	} else {
		await writeJSON(fileName, await buildUploadPayload(note));
	}
	return NoteUploadResult.Uploaded;
}

async function runPull(force = false) {
	let pageToken: string | undefined;
	let remoteNotes: Note[];
	let remoteCount: number = 0;
	let downloaded: number = 0;
	const syncStartedAt = new Date();
	do {
		({ token: pageToken, notes: remoteNotes } = await readRemoteNotes(force, pageToken));
		const readCount = remoteNotes.length;
		if (readCount === 0) {
			continue;
		}
		remoteCount += readCount;
		const changes = mergeNotesByModifiedAt(notesStore.notes(), remoteNotes);
		const changeCount = changes.length;
		if (changeCount > 0) {
			await notesStore.replaceMultiple(changes);
			downloaded += changeCount;
		}
		addNotification("success", `Fetching remote notes (${remoteCount} loaded)`);
	} while (pageToken);
	await purgeRemoteFiles(await notesStore.purgeExpiredTrash());
	setLastSyncedToLocalAt(syncStartedAt);
	return { remoteCount, downloaded };
}

async function runPush(purged: ReadonlyArray<UUID> = [], force = false) {
	const syncStartedAt = new Date();
	await purgeRemoteFiles(purged);
	const threshold = getTime(lastSyncedToCloudAt() ?? lastSyncedToLocalAt());
	const candidates = force ? notesStore.notes() : notesStore.notes().filter(n => noteEffectiveTime(n) > threshold);
	const results = await Promise.all(candidates.map(uploadNote));
	setLastSyncedToCloudAt(syncStartedAt);
	return {
		conflicts: results.filter(r => r === "conflict").length
	};
}

async function saveToCloud(purged: ReadonlyArray<UUID> = []) {
	if (state.isSyncing) {
		return;
	}
	try {
		setState(draft => {
			draft.isSyncing = true;
		});
		await runPush(purged, false);
	} finally {
		setState(draft => {
			draft.isSyncing = false;
		});
	}
}

export async function doPullAndPush({ force = false as boolean, purged = [] as ReadonlyArray<UUID> } = {}) {
	if (state.isSyncing) {
		return;
	}
	setState(draft => {
		draft.isSyncing = true;
		draft.syncError = null;
	});
	try {
		const pullResult = await runPull(force);
		const pushResult = await runPush(purged, force);
		const empty = pullResult.remoteCount === 0 && notesStore.notes().length === 0;
		const changes = pushResult.conflicts + pullResult.downloaded;
		addNotification("success", empty ? "Nothing to sync" : `Synced${changes > 0 ? ` (pulled ${changes} change${changes > 1 ? "s" : emptyString} from cloud)` : emptyString}`);
	} catch (err: any) {
		setState(draft => {
			draft.syncError = err?.message ?? "Sync failed";
		});
		addNotification("danger", `Sync failed: ${state.syncError}`);
	} finally {
		setState(draft => {
			draft.isSyncing = false;
		});
	}
}

export async function setAutoSync(enabled: boolean) {
	setState(draft => {
		draft.autoSyncEnabled = enabled;
	});
	if (!enabled) {
		requestSync.cancel();
	}
}

runWithOwner(getAppOwner(), () => {
	createEffect(
		lastSyncedToLocalAt,
		date => {
			queueMicrotask(async () => {
				if (date) {
					await setKV(LAST_SYNCED_TO_LOCAL_KEY, date.toISOString());
				} else {
					await deleteKV(LAST_SYNCED_TO_LOCAL_KEY);
				}
			});
		},
		{ defer: true }
	);
	createEffect(
		lastSyncedToCloudAt,
		date => {
			queueMicrotask(async () => {
				if (date) {
					await setKV(LAST_SYNCED_TO_CLOUD_KEY, date.toISOString());
				} else {
					await deleteKV(LAST_SYNCED_TO_CLOUD_KEY);
				}
			});
		},
		{ defer: true }
	);
	createEffect(
		() => state.autoSyncEnabled,
		flag => {
			queueMicrotask(async () => {
				await setKV(AUTO_SYNC_KEY, flag);
			});
		},
		{ defer: true }
	);
});