import { CharacterClassElement, CharacterClassRange } from "regexpp/ast";
import { CleanRegexRule, createRuleListener, getDocUrl } from "../rules-util";
import { assertNever, emptyCharSet, minimalHexEscape, toCharSet } from "../util";

function elementToString(element: CharacterClassElement): string {
	switch (element.type) {
		case "Character":
			return `${element.raw} (${minimalHexEscape(element.value)})`;
		case "CharacterClassRange":
			return `${element.raw} (${minimalHexEscape(element.min.value)}-${minimalHexEscape(element.max.value)})`;
		case "CharacterSet":
			return element.raw;
		default:
			throw assertNever(element);
	}
}

export default {
	meta: {
		type: "suggestion",
		docs: {
			description: "Disallows unnecessary elements in character classes.",
			url: getDocUrl(/* #GENERATED */ "optimized-character-class"),
		},
		fixable: "code",
	},

	create(context) {
		return createRuleListener(({ visitAST, flags, removeElement, replaceElement }) => {
			visitAST({
				onCharacterClassEnter(node) {
					const elements = node.elements;
					if (elements.length === 0) {
						// it's optimal as is
						return;
					}

					interface Report {
						message: string;
						replacement: string;
					}
					const reports = new Map<CharacterClassElement, Report>();

					function checkRangeElements(range: CharacterClassRange): void {
						// Note: These reports may later be overwritten should the range be removed.

						if (range.min.value === range.max.value) {
							reports.set(range, {
								message: `${elementToString(range)} contains only a single value.`,
								replacement: range.min.raw === "-" ? "\\-" : range.min.raw,
							});
						}

						if (range.min.value + 1 === range.max.value) {
							const min = range.min.raw === "-" ? "\\-" : range.min.raw;
							const max = range.max.raw === "-" ? "\\-" : range.max.raw;
							reports.set(range, {
								message: `${elementToString(range)} contains only its two ends.`,
								replacement: min + max,
							});
						}
					}

					for (const element of elements) {
						if (element.type === "CharacterClassRange") {
							checkRangeElements(element);
						}
					}

					// detect duplicates and subsets

					// This will be done in 3 phases. First we check all single characters, then all characters ranges,
					// and last all character sets. This will ensure that we keep character sets over character ranges,
					// and character ranges over character sets.

					const empty = emptyCharSet(flags);
					const elementChars = elements.map(e => toCharSet([e], flags));

					const order: CharacterClassElement["type"][] = ["Character", "CharacterClassRange", "CharacterSet"];
					for (const currentType of order) {
						for (let i = elements.length - 1; i >= 0; i--) {
							const current = elements[i];
							if (current.type !== currentType) {
								continue;
							}

							const currentChars = elementChars[i];
							const totalWithCurrent = empty.union(...elementChars.filter((_, index) => index !== i));

							if (totalWithCurrent.isSupersetOf(currentChars)) {
								elementChars[i] = empty;

								// try to find a single element which is still a superset
								let simpleSuper: CharacterClassElement | undefined = undefined;
								for (let k = 0; k < elements.length; k++) {
									if (elementChars[k].isSupersetOf(currentChars)) {
										simpleSuper = elements[k];
										break;
									}
								}

								if (simpleSuper === undefined) {
									reports.set(current, {
										message: `${elementToString(
											current
										)} is already included by some combination of other elements.`,
										replacement: "",
									});
								} else {
									reports.set(current, {
										message: `${elementToString(current)} is already included by ${elementToString(
											simpleSuper
										)}.`,
										replacement: "",
									});
								}
							}
						}
					}

					for (const [element, { message, replacement }] of reports) {
						if (replaceElement) {
							context.report({
								message,
								...replaceElement(element, replacement),
							});
						} else {
							context.report({
								message,
								...removeElement(element),
							});
						}
					}
				},
			});
		});
	},
} as CleanRegexRule;
