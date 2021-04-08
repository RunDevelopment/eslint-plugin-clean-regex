import { AST } from "regexpp";
import {
	Alternative,
	LookaroundAssertion,
	Backreference,
	CapturingGroup,
	Character,
	CharacterClassElement,
	Group,
	Quantifier,
	Element,
	Node,
	Pattern,
	EscapeCharacterSet,
	UnicodePropertyCharacterSet,
	BranchNode,
	EdgeAssertion,
} from "regexpp/ast";
import { assertNever, Simple } from "./util";
import * as RAA from "regexp-ast-analysis";

type Flags = Partial<Readonly<AST.Flags>>;

/**
 * Returns whether the given node is constant meaning that it can only match one string and what this string is.
 * If the node is constant, it will return the constant string.
 */
export function getConstant(node: Node, flags: Flags): false | { word: string } {
	switch (node.type) {
		case "Alternative": {
			let word = "";
			for (const element of node.elements) {
				const elementResult = getConstant(element, flags);
				if (elementResult === false) {
					return false;
				} else {
					word += elementResult.word;
				}
			}
			return { word };
		}
		case "Assertion":
		case "Flags": {
			// Assertions are constant because the only affect whether a string matches.
			// Flags are trivially constant
			return { word: "" };
		}
		case "Backreference": {
			if (isEmptyBackreference(node)) {
				return { word: "" };
			} else {
				// only constant if the expression of the capturing group is constant
				return getConstant(node.resolved, flags);
			}
		}
		case "CapturingGroup":
		case "Group":
		case "Pattern": {
			if (node.alternatives.length == 0) {
				return { word: "" };
			} else if (node.alternatives.length == 1) {
				return getConstant(node.alternatives[0], flags);
			} else {
				let word: string | false = false;
				for (const alt of node.alternatives) {
					const altResult = getConstant(alt, flags);
					if (altResult === false) {
						return false;
					} else if (word === false) {
						word = altResult.word;
					} else if (word !== altResult.word) {
						return false;
					}
				}
				return word === false ? false : { word };
			}
		}
		case "Character": {
			const string = String.fromCodePoint(node.value);
			if (flags.ignoreCase && string.toLowerCase() !== string.toUpperCase()) {
				return false;
			}
			return { word: string };
		}
		case "CharacterClass": {
			// Here's a question is the empty character class (`[]` or `[^\s\S]`) constant?
			// I say, no it isn't.
			if (node.negate) {
				// negated character classes are 1) really hard to check and 2) very unlikely to be constant
				return false;
			}

			let word: false | string = false;
			for (const element of node.elements) {
				const elementResult = getConstant(element, flags);
				if (elementResult === false) {
					return false;
				} else if (word === false) {
					word = elementResult.word;
				} else if (word !== elementResult.word) {
					return false;
				}
			}
			return word === false ? false : { word };
		}
		case "CharacterClassRange": {
			return node.min.value == node.max.value && getConstant(node.min, flags);
		}
		case "CharacterSet": {
			// for themselves, character sets like \w, ., \s are not constant
			return false;
		}
		case "Quantifier": {
			if (node.max === 0) {
				return { word: "" };
			}
			const elementResult = getConstant(node.element, flags);
			if (elementResult !== false) {
				if (elementResult.word === "") {
					return elementResult;
				} else if (node.min === node.max) {
					let word = "";
					for (let i = node.min; i > 0; i--) {
						word += elementResult.word;
					}
					return { word };
				}
			}
			return false;
		}
		case "RegExpLiteral": {
			return getConstant(node.pattern, flags);
		}
		default:
			return false;
	}
}
export function isZeroLength(element: Element | Alternative | Alternative[]): boolean {
	return RAA.isZeroLength(element);
}
export function isEmpty(element: Element | Alternative | Alternative[]): boolean {
	return RAA.isEmpty(element);
}
export function isPotentiallyEmpty(element: Element | Alternative | Alternative[]): boolean {
	return RAA.isPotentiallyEmpty(element);
}

export function hasSomeAncestor(node: Node, conditionFn: (ancestor: BranchNode) => boolean): boolean {
	return RAA.hasSomeAncestor(node, conditionFn);
}
export type Descendants<T extends Node> = RAA.Descendant<T>;
export function hasSomeDescendant<T extends Node>(
	node: T,
	conditionFn: (descendant: Descendants<T>) => boolean,
	descentConditionFn?: (descendant: Descendants<T>) => boolean
): boolean {
	return RAA.hasSomeDescendant(node, conditionFn, descentConditionFn);
}

/**
 * Returns whether the given node is or contains a capturing group.
 *
 * This function is justified because it's extremely important to check for capturing groups when providing fixers.
 *
 * @param node
 */
export function hasCapturingGroup(node: Node): boolean {
	return hasSomeDescendant(node, d => d.type === "CapturingGroup");
}

export function areEqual(x: Node | null, y: Node | null): boolean {
	return RAA.structurallyEqual(x, y);
}

/**
 * Returns the minimal hexadecimal escape sequence of a given code point.
 *
 * This will use one of the following formats: `\xFF`, `\uFFFF`, or `\u{10FFFF}`.
 */
export function minimalHexEscape(codePoint: number): string {
	if (codePoint <= 0xff) {
		return "\\x" + codePoint.toString(16).padStart(2, "0");
	} else if (codePoint <= 0xffff) {
		return "\\u" + codePoint.toString(16).padStart(4, "0");
	} else {
		return "\\u{" + codePoint.toString(16) + "}";
	}
}

/**
 * Returns whether the given character is written as an octal escape sequence (e.g. `\0`, `\12`).
 */
export function isOctalEscapeSequence(node: Character): boolean {
	return /^\\[0-7]+$/.test(node.raw);
}
/**
 * Returns whether the given character is written as a control escape sequence (e.g. `\cI`).
 */
export function isControlEscapeSequence(node: Character): boolean {
	return /^\\c[A-Za-z]$/.test(node.raw);
}
/**
 * Returns whether the given character is written as a hexadecimal escape sequence (e.g. `\xFF` `\u00FFF` `\u{FF}`).
 */
export function isHexadecimalEscapeSequence(node: Character): boolean {
	return /^\\(?:x[\da-fA-F]{2}|u[\da-fA-F]{4}|u\{[\da-fA-F]+\})$/.test(node.raw);
}

/**
 * Returns whether the given node is a escape sequence.
 *
 * This includes octal escapes (e.g. `\31`), hexadecimal escapes (e.g. `\xFF` `\u00FFF` `\u{FF}`), control character
 * escapes (e.g. `\cI`), and other escape sequences like `\n` and `\t`.
 *
 * This does not include the character-class-exclusive `\b` escape for backspace.
 *
 * This does not include literal escapes where the escaped character is equal to the character after the backslash
 * (e.g. `\G`, `\\`, `\?`) and character sequences.
 */
export function isEscapeSequence(node: Character): boolean {
	return (
		isOctalEscapeSequence(node) || // octal
		isHexadecimalEscapeSequence(node) || // hexadecimal
		isControlEscapeSequence(node) || // control character
		/^\\[fnrtv]$/.test(node.raw) // form feed, new line, carrier return, tab, vertical tab
	);
}

export interface Quant {
	min: number;
	max: number;
	greedy?: boolean;
}

/**
 * Returns the string representation of the given quantifier.
 */
export function quantToString(quant: Readonly<Quant>): string {
	if (
		quant.max < quant.min ||
		quant.min < 0 ||
		!Number.isInteger(quant.min) ||
		!(Number.isInteger(quant.max) || quant.max === Infinity)
	) {
		throw new Error(`Invalid quantifier { min: ${quant.min}, max: ${quant.max} }`);
	}

	let value;
	if (quant.min === 0 && quant.max === 1) {
		value = "?";
	} else if (quant.min === 0 && quant.max === Infinity) {
		value = "*";
	} else if (quant.min === 1 && quant.max === Infinity) {
		value = "+";
	} else if (quant.min === quant.max) {
		value = `{${quant.min}}`;
	} else if (quant.max === Infinity) {
		value = `{${quant.min},}`;
	} else {
		value = `{${quant.min},${quant.max}}`;
	}

	if (!quant.greedy) {
		return value + "?";
	} else {
		return value;
	}
}
export function quantAdd(quant: Readonly<Quant>, other: number | Readonly<Quant>): Quant {
	if (typeof other === "number") {
		return {
			min: quant.min + other,
			max: quant.max + other,
			greedy: quant.greedy,
		};
	} else {
		if (quant.greedy === other.greedy || quant.greedy === undefined || other.greedy === undefined) {
			return {
				min: quant.min + other.min,
				max: quant.max + other.max,
				greedy: quant.greedy ?? other.greedy,
			};
		} else {
			throw Error("The `greedy` property of the given quants is not compatible.");
		}
	}
}

/**
 * Returns the raw string of the negated character set.
 *
 * I.e. for a given `\S` is will return `"\s"`.
 *
 * This __does not__ support the dot character set.
 */
export function negateCharacterSetRaw(charSet: Readonly<EscapeCharacterSet | UnicodePropertyCharacterSet>): string {
	let type = charSet.raw[1];
	if (type.toLowerCase() === type) {
		type = type.toUpperCase();
	} else {
		type = type.toLowerCase();
	}
	return `\\${type}${charSet.raw.substr(2)}`;
}

/**
 * Returns the string representation of the given character class elements in a character class.
 */
export function elementsToCharacterClass(elements: Readonly<Simple<CharacterClassElement>>[], negate = false): string {
	// This won't do any optimization.
	// Its ONLY job is to generate a valid character class from the given elements.
	// Optimizations can be done by the optimize-character-class rule.

	let result = "";
	elements.forEach((e, i) => {
		switch (e.type) {
			case "Character":
				if (e.raw === "-") {
					if (i === 0 || i === elements.length - 1) {
						result += "-";
					} else {
						result += "\\-";
					}
				} else if (e.raw === "^") {
					if (i === 0) {
						result += "\\^";
					} else {
						result += "^";
					}
				} else if (e.raw === "]") {
					result += "\\]";
				} else {
					result += e.raw;
				}
				break;

			case "CharacterClassRange":
				if (e.min.raw === "^" && i === 0) {
					result += "\\^-" + e.max.raw;
				} else {
					result += e.min.raw + "-" + e.max.raw;
				}
				break;

			case "CharacterSet":
				result += e.raw;
				break;

			default:
				throw assertNever(e);
		}
	});

	return "[" + (negate ? "^" : "") + result + "]";
}

export function isEmptyBackreference(backreference: Backreference): boolean {
	return RAA.isEmptyBackreference(backreference);
}

export function backreferenceAlwaysAfterGroup(backreference: Backreference): boolean {
	return RAA.backreferenceAlwaysAfterGroup(backreference);
}

/**
 * Returns the raw string of the quantifier without the quantified element.
 *
 * E.g. for `a+?`, `+?` will be returned.
 */
export function getQuantifierRaw(quantifier: Quantifier): string {
	return quantifier.raw.substr(quantifier.element.end - quantifier.start);
}

export type MatchingDirection = RAA.MatchingDirection;
export function matchingDirection(node: Node): MatchingDirection {
	return RAA.getMatchingDirection(node);
}

/**
 * `lookahead` is here equivalent to `ltr` and `lookbehind` is equivalent to `rtl`.
 */
export function invertMatchingDirection(direction: LookaroundAssertion["kind"] | MatchingDirection): MatchingDirection {
	return direction === "ltr" || direction === "lookahead" ? "rtl" : "ltr";
}
export function assertionKindToMatchingDirection(
	kind: LookaroundAssertion["kind"] | EdgeAssertion["kind"]
): MatchingDirection {
	return kind === "end" || kind === "lookahead" ? "ltr" : "rtl";
}

export function getLengthRange(
	element: Element | Alternative | Alternative[]
): { min: number; max: number } | undefined {
	return RAA.getLengthRange(element);
}

export type FirstConsumedChar = RAA.FirstConsumedChar;
export function getFirstCharConsumedBy(
	element: Element | Alternative | Alternative[],
	direction: MatchingDirection,
	flags: Flags
): FirstConsumedChar {
	return RAA.getFirstConsumedChar(element, direction, flags);
}
export type FirstCharAfter = RAA.FirstCharAfter;
export function getFirstCharAfter(afterThis: Element, direction: MatchingDirection, flags: Flags): FirstCharAfter {
	return RAA.getFirstCharAfter(afterThis, direction, flags);
}

/**
 * Returns whether the given node either is or is under an effectively star quantifier.
 *
 * All quantifiers with a max larger than a certain threshold are assumed to have a max of infinity.
 */
export function underAStar(node: Node): boolean {
	return RAA.getEffectiveMaximumRepetition(node) > 20;
}

/**
 * Returns the content prefix and suffix of the given parent node.
 */
export function getParentPrefixAndSuffix(
	parent: Pattern | CapturingGroup | Group | LookaroundAssertion
): [string, string] {
	switch (parent.type) {
		case "Assertion":
			return ["(?" + (parent.kind === "lookahead" ? "" : "<") + (parent.negate ? "!" : "="), ")"];

		case "CapturingGroup":
			if (parent.name !== null) {
				return ["(?<" + parent.name + ">", ")"];
			} else {
				return ["(", ")"];
			}

		case "Group":
			return ["(?:", ")"];

		case "Pattern":
			return ["", ""];

		default:
			throw assertNever(parent);
	}
}
