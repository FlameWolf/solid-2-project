export function debounce<T extends (...args: any[]) => any>(fn: T, wait: number): ((...args: Parameters<T>) => void) & { cancel: () => void } {
	let timeoutId: ReturnType<typeof setTimeout> | null = null;
	return Object.assign(
		function (this: unknown, ...args: Parameters<T>): void {
			if (timeoutId !== null) clearTimeout(timeoutId);
			timeoutId = setTimeout(() => {
				timeoutId = null;
				fn.apply(this, args);
			}, wait);
		},
		{
			cancel() {
				if (timeoutId !== null) {
					clearTimeout(timeoutId);
					timeoutId = null;
				}
			}
		}
	);
}

export function throttle<T extends (...args: any[]) => any>(fn: T, wait: number): ((...args: Parameters<T>) => void) & { cancel: () => void } {
	let lastCall = 0;
	let timeoutId: ReturnType<typeof setTimeout> | null = null;
	let lastArgs: Parameters<T> | null = null;
	let lastThis: unknown = null;
	return Object.assign(
		function (this: unknown, ...args: Parameters<T>): void {
			const now = Date.now();
			const remaining = wait - (now - lastCall);
			lastArgs = args;
			lastThis = this;
			if (remaining <= 0) {
				if (timeoutId !== null) {
					clearTimeout(timeoutId);
					timeoutId = null;
				}
				lastCall = now;
				fn.apply(lastThis, lastArgs);
			} else if (timeoutId === null) {
				timeoutId = setTimeout(() => {
					lastCall = Date.now();
					timeoutId = null;
					if (lastArgs) fn.apply(lastThis, lastArgs);
				}, remaining);
			}
		},
		{
			cancel() {
				if (timeoutId !== null) {
					clearTimeout(timeoutId);
					timeoutId = null;
				}
				lastCall = 0;
				lastArgs = null;
				lastThis = null;
			}
		}
	);
}