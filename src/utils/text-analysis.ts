import { emptyString } from "@/constants/common";

const summaryLength = 100;
const wordMatchRegExp = /[\p{L}\p{M}\p{Nd}\p{Pc}\p{Join_C}]+/u;
const sentenceSegmenter = new Intl.Segmenter("en", { granularity: "sentence" });
const wordSegmenter = new Intl.Segmenter("en", { granularity: "word" });
const characterSegmenter = new Intl.Segmenter("en", { granularity: "grapheme" });
const searchCollator = new Intl.Collator("en", { sensitivity: "accent", usage: "search" });
const sortCollator = new Intl.Collator("en", { numeric: true, usage: "sort" });

function iterableLength(segments: Intl.Segments): number {
	let count = 0;
	for (const _ of segments) {
		count++;
	}
	return count;
}

export function truncate(text: string, limit: number): string {
	const parts: string[] = [];
	for (const { segment } of characterSegmenter.segment(text)) {
		parts.push(segment);
		if (parts.length >= limit) {
			return parts.join(emptyString);
		}
	}
	return text;
}

export function getSummary(text: string): string {
	const normalised = text.replace(/\s+/g, " ").trim();
	const truncated = truncate(normalised, summaryLength);
	return truncated.length === normalised.length ? truncated : `${truncated}\u2026`;
}

export function getSentenceCount(text: string): number {
	return iterableLength(sentenceSegmenter.segment(text));
}

export function getWordCount(text: string): number {
	let count = 0;
	for (const { segment } of wordSegmenter.segment(text)) {
		if (wordMatchRegExp.test(segment)) {
			count++;
		}
	}
	return count;
}

export function getCharacterCount(text: string): number {
	return iterableLength(characterSegmenter.segment(text));
}

export function contains(text: string, search: string): boolean {
	return new RegExp(RegExp.escape(search), "i").test(text);
}

export function equals(first: string, second: string): boolean {
	return searchCollator.compare(first, second) === 0;
}

export function isTextWithin(text: string, limit: number): boolean {
	if (!text || !limit) {
		return true;
	}
	if (text.length > limit * 16) {
		return false;
	}
	let count = 0;
	for (const _ of characterSegmenter.segment(text)) {
		if (++count > limit) {
			return false;
		}
	}
	return true;
}

export function sort(array: ReadonlyArray<string>): string[] {
	return array.toSorted(sortCollator.compare);
}