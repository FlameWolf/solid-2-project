export async function ensurePersistentStorage(): Promise<boolean> {
	if (!navigator.storage?.persist) {
		return false;
	}
	try {
		if (await navigator.storage.persisted()) {
			return true;
		}
		return await navigator.storage.persist();
	} catch (err) {
		console.error("Persistent storage request failed", err);
		return false;
	}
}