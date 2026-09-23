export function camelToKebab(input: string) {
	return input
		.replace(/([a-z0-9])([A-Z])/g, "$1-$2")
		.replace(/([A-Z])([A-Z][a-z])/g, "$1-$2")
		.toLowerCase();
}

export function titleCase(input: string) {
	return input.toLowerCase().replace(/\b\w/g, match => match.toUpperCase());
}

export function normaliseTag(raw: string): string {
	return raw.trim().replace(/\s+/g, " ").normalize("NFC");
}

export function mergeArrays<T>(a: readonly T[] = [], b: readonly T[] | undefined = []): T[] {
	return Array.from(new Set(a.concat(b)));
}

export function areArraysEqual<T>(a: readonly T[] = [], b: readonly T[] | undefined = []): boolean {
	if (a.length !== b.length) {
		return false;
	}
	const set = new Set(a);
	return b.every(x => set.has(x));
}

export function areSetsEqual(setA: Set<unknown>, setB: Set<unknown>) {
	return setA.symmetricDifference(setB).size === 0;
}

export function arrayContainsSet<T>(array: T[], set: Set<T>) {
	if (array.length < set.size) {
		return false;
	}
	for (const element of set) {
		if (!array.includes(element)) {
			return false;
		}
	}
	return true;
}