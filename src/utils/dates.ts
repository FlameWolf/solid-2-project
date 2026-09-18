export function parseValidDate(value: string | undefined): Date | undefined {
	if (!value) {
		return undefined;
	}
	const date = new Date(value);
	return Number.isNaN(date.getTime()) ? undefined : date;
}

export function getTime(value: Date | null | undefined): number {
	return value?.getTime() ?? 0;
}