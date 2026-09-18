import { emptyString } from "@/constants/common";
import { isTextFile } from "@/utils/file-detection";
import { sort } from "@/utils/text-analysis";
import { create, type Note } from "@/models/Note";
import * as notesStore from "@/stores/notes";
import { addNotification } from "@/stores/notifications";

interface ImportError {
	fileName: string;
	message: string;
}

const JSZip = (await import("jszip")).default;

function formatImportErrors(errors: ImportError[]): string {
	return ["Import failed for the following file", errors.length === 1 ? emptyString : "s", ":<hr/>", `<ul>${errors.map(err => `<li>${err.fileName}: ${err.message}</li>`).join(emptyString)}</ul>`].join(emptyString);
}

function triggerDownload(blob: Blob, filename: string) {
	const url = URL.createObjectURL(blob);
	const anchor = document.createElement("a");
	anchor.href = url;
	anchor.download = filename;
	document.body.appendChild(anchor);
	anchor.click();
	setTimeout(() => {
		document.body.removeChild(anchor);
		URL.revokeObjectURL(url);
	});
}

function sanitizeFilename(name: string): string {
	return name.replace(/[<>:"/\\|?*]+/g, "_").trim() || "Untitled";
}

function formatOutput(content: string, tags?: string[]): string {
	return `${content}${tags?.length ? `\n\nTags: ${sort(tags).join(", ")}` : emptyString}\n`;
}

export function importFiles(): Promise<number> {
	return new Promise(resolve => {
		const errors: ImportError[] = [];
		const input = document.createElement("input");
		input.type = "file";
		input.multiple = true;
		input.addEventListener("change", async () => {
			const files = input.files;
			if (!files || files.length === 0) {
				resolve(0);
				return;
			}
			let count = 0;
			for (const file of files) {
				if (!(await isTextFile(file))) {
					errors.push({
						fileName: file.name,
						message: "Unsupported file type"
					});
					continue;
				}
				try {
					const content = await file.text();
					const title = file.name.replace(/\.txt$/i, emptyString) || "Untitled";
					await notesStore.addNote(create(title, content));
					count++;
				} catch {
					errors.push({
						fileName: file.name,
						message: "Failed to read file"
					});
				}
			}
			if (errors.length) {
				addNotification("danger", formatImportErrors(errors));
			}
			resolve(count);
		});
		input.click();
	});
}

export async function exportNote(note: Note) {
	const content = (await notesStore.getNoteContent(note.id)) ?? emptyString;
	const blob = new Blob([formatOutput(content, note.tags)], { type: "text/plain;charset=utf-8" });
	triggerDownload(blob, `${sanitizeFilename(note.title)}.txt`);
}

export async function exportNotes(notes: Note[]) {
	if (notes.length === 0) {
		return;
	}
	const zip = new JSZip();
	const usedNames = new Set<string>();
	for (const note of notes) {
		const name = sanitizeFilename(note.title);
		let uniqueName = name;
		let counter = 1;
		while (usedNames.has(uniqueName)) {
			uniqueName = `${name} (${counter++})`;
		}
		usedNames.add(uniqueName);
		const content = (await notesStore.getNoteContent(note.id)) ?? emptyString;
		zip.file(`${uniqueName}.txt`, formatOutput(content, note.tags));
	}
	const blob = await zip.generateAsync({ type: "blob" });
	triggerDownload(blob, "quick-pad-notes.zip");
}

export async function exportAllNotes() {
	await exportNotes(notesStore.activeNotes());
}