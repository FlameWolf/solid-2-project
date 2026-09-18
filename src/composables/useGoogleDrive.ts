import { DRIVE_API, UPLOAD_API } from "@/constants/sync";
import { getAccessToken } from "@/composables/useGoogleAuth";

interface DriveFile {
	id: string;
	name: string;
	modifiedTime: string;
}

async function fetchOrThrow(url: string, init?: RequestInit): Promise<Response> {
	const res = await fetch(url, init);
	if (!res.ok) {
		let detail = res.statusText;
		const body = await res.text();
		if (body) {
			detail = body;
		}
		throw new Error(`Drive API ${res.status}: ${detail}`);
	}
	return res;
}

async function headers() {
	const token = await getAccessToken();
	return {
		Authorization: `Bearer ${token}`
	};
}

export async function listFiles(namePrefix?: string, modifiedTime?: Date | null, pageToken?: string): Promise<{ pageToken: string | undefined; fileList: DriveFile[] }> {
	const queryParts = ["'appDataFolder' in parents", "trashed=false"];
	if (namePrefix) {
		queryParts.push(`name contains '${namePrefix}'`);
	}
	if (modifiedTime) {
		queryParts.push(`modifiedTime >= '${modifiedTime.toISOString()}'`);
	}
	const files: DriveFile[] = [];
	const params = new URLSearchParams({
		spaces: "appDataFolder",
		q: queryParts.join(" and "),
		fields: "files(id,name),nextPageToken",
		pageSize: "25"
	});
	if (pageToken) {
		params.set("pageToken", pageToken);
	}
	const res = await fetchOrThrow(`${DRIVE_API}?${params}`, {
		headers: await headers()
	});
	const data = await res.json();
	if (Array.isArray(data.files)) {
		files.push(...data.files);
	}
	return {
		pageToken: data.nextPageToken,
		fileList: namePrefix ? files.filter(f => f.name.startsWith(namePrefix)) : files
	};
}

export async function findFile(name: string): Promise<DriveFile | null> {
	const params = new URLSearchParams({
		spaces: "appDataFolder",
		q: `name='${name}' and 'appDataFolder' in parents and trashed=false`,
		fields: "files(id,name,modifiedTime)"
	});
	const res = await fetchOrThrow(`${DRIVE_API}?${params}`, {
		headers: await headers()
	});
	const data = await res.json();
	return data.files?.[0] ?? null;
}

export async function readJSON<T = unknown>(filename: string): Promise<T | null> {
	const file = await findFile(filename);
	if (!file) {
		return null;
	}
	const res = await fetchOrThrow(`${DRIVE_API}/${file.id}?alt=media`, {
		headers: await headers()
	});
	return res.json();
}

export async function readJSONById<T = unknown>(fileId: string): Promise<T | null> {
	const res = await fetchOrThrow(`${DRIVE_API}/${fileId}?alt=media`, {
		headers: await headers()
	});
	return res.json();
}

export async function writeJSONById(fileId: string, data: unknown): Promise<void> {
	const body = JSON.stringify(data);
	await fetchOrThrow(`${UPLOAD_API}/${fileId}?uploadType=media`, {
		method: "PATCH",
		headers: Object.assign(await headers(), { "Content-Type": "application/json" }),
		body
	});
}

export async function writeJSON(filename: string, data: unknown): Promise<void> {
	const file = await findFile(filename);
	if (file) {
		await writeJSONById(file.id, data);
	} else {
		const body = JSON.stringify(data);
		const metadata = {
			name: filename,
			parents: ["appDataFolder"],
			mimeType: "application/json"
		};
		const form = new FormData();
		form.append("metadata", new Blob([JSON.stringify(metadata)], { type: "application/json" }));
		form.append("file", new Blob([body], { type: "application/json" }));
		await fetchOrThrow(`${UPLOAD_API}?uploadType=multipart`, {
			method: "POST",
			headers: await headers(),
			body: form
		});
	}
}

export async function deleteFileById(fileId: string): Promise<void> {
	await fetchOrThrow(`${DRIVE_API}/${fileId}`, {
		method: "DELETE",
		headers: await headers()
	});
}

export async function deleteFile(filename: string): Promise<boolean> {
	const file = await findFile(filename);
	if (!file) {
		return false;
	}
	await deleteFileById(file.id);
	return true;
}