import { visitRegExpAST } from "regexpp";
import {
	Alternative,
	Assertion,
	LookaroundAssertion,
	Backreference,
	CapturingGroup,
	Character,
	CharacterClass,
	CharacterClassElement,
	CharacterSet,
	Group,
	Quantifier,
	Element,
	Node,
	Pattern,
	Flags,
	EscapeCharacterSet,
	UnicodePropertyCharacterSet,
	BranchNode,
	CharacterClassRange,
	RegExpLiteral,
	AnyCharacterSet,
} from "regexpp/ast";
import { JS, DFA, CharSet, NFA, ReadonlyNFA } from "refa";

export interface FirstChar {
	/**
	 * A super set of the first character.
	 *
	 * We can usually only guarantee a super set because lookaround in the pattern may narrow down the actual character
	 * set.
	 */
	char: CharSet;
	/**
	 * If `false`, then the first character also includes the empty word.
	 */
	nonEmpty: boolean;
	/**
	 * If `true`, then `char` is guaranteed to be exactly the first character and not just a super set of it.
	 */
	exact: boolean;
}

/**
 * @typedef {import("./util-types").Simple<T>} Simple
 * @template T
 */

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

/**
 * Returns whether all paths of the given element don't move the position of the automaton.
 */
export function isZeroLength(element: Element | Alternative | Alternative[]): boolean {
	if (Array.isArray(element)) {
		return element.every(a => isZeroLength(a));
	}

	switch (element.type) {
		case "Alternative":
			return element.elements.every(e => isZeroLength(e));

		case "Assertion":
			return true;

		case "Character":
		case "CharacterClass":
		case "CharacterSet":
			return false;

		case "Quantifier":
			return element.max === 0 || isZeroLength(element.element);

		case "Backreference":
			return isEmptyBackreference(element);

		case "CapturingGroup":
		case "Group":
			return isZeroLength(element.alternatives);

		default:
			throw assertNever(element);
	}
}

/**
 * Returns whether at least one path of the given element does not move the position of the automation.
 */
export function isPotentiallyZeroLength(element: Element | Alternative | Alternative[]): boolean {
	if (Array.isArray(element)) {
		return element.some(a => isPotentiallyZeroLength(a));
	}

	switch (element.type) {
		case "Alternative":
			return element.elements.every(e => isPotentiallyZeroLength(e));

		case "Assertion":
			return true;

		case "Backreference":
			if (isEmptyBackreference(element)) {
				return true;
			}
			return isPotentiallyZeroLength(element.resolved);

		case "Character":
		case "CharacterClass":
		case "CharacterSet":
			return false;

		case "CapturingGroup":
		case "Group":
			return isPotentiallyZeroLength(element.alternatives);

		case "Quantifier":
			return element.min === 0 || isPotentiallyZeroLength(element.element);

		default:
			throw assertNever(element);
	}
}

/**
 * Returns whether all paths of the given element does not move the position of the automation and accept
 * regardless of prefix and suffix.
 *
 * @param {Element | Alternative | Alternative[]} element
 */
export function isEmpty(element: Element | Alternative | Alternative[]): boolean {
	if (Array.isArray(element)) {
		return element.every(isEmpty);
	}

	switch (element.type) {
		case "Alternative":
			return element.elements.every(isEmpty);

		case "Assertion":
			// assertion do not consume characters but they do usually reject some pre- or suffixes
			if (element.kind === "lookahead" || element.kind === "lookbehind") {
				if (!element.negate && isPotentiallyEmpty(element.alternatives)) {
					// if a positive lookaround is potentially empty, it will trivially accept all pre- or suffixes
					return true;
				}
			}
			return false;

		case "Backreference":
			if (isEmptyBackreference(element)) {
				return true;
			}
			return isEmpty(element.resolved);

		case "Character":
		case "CharacterClass":
		case "CharacterSet":
			return false;

		case "CapturingGroup":
		case "Group":
			return isEmpty(element.alternatives);

		case "Quantifier":
			return element.max === 0 || isEmpty(element.element);

		default:
			throw assertNever(element);
	}
}

export interface IsPotentiallyEmptyOptions {
	/**
	 * If `true`, then backreferences that aren't guaranteed to always be replaced with the empty string will be
	 * assumed to be non-empty.
	 */
	backreferencesAreNonEmpty?: boolean;
}
/**
 * Returns whether at least one path of the given element does not move the position of the automation and accepts
 * regardless of prefix and suffix.
 *
 * This basically means that it can match the empty string and that it does that at any position in any string.
 * Lookarounds do not affect this as (as mentioned above) all prefixes and suffixes are accepted.
 */
export function isPotentiallyEmpty(
	element: Element | Alternative | Alternative[],
	options: Readonly<IsPotentiallyEmptyOptions> = {}
): boolean {
	if (Array.isArray(element)) {
		return element.some(a => isPotentiallyEmpty(a, options));
	}

	switch (element.type) {
		case "Alternative":
			return element.elements.every(e => isPotentiallyEmpty(e, options));

		case "Assertion":
			// assertion do not consume characters but they do usually reject some pre- or suffixes
			if (element.kind === "lookahead" || element.kind === "lookbehind") {
				if (!element.negate && isPotentiallyEmpty(element.alternatives, options)) {
					// if a positive lookaround is potentially empty, it will trivially accept all pre- or suffixes
					return true;
				}
			}
			return false;

		case "Backreference":
			if (isEmptyBackreference(element)) {
				return true;
			}
			if (options.backreferencesAreNonEmpty) {
				return false;
			} else {
				return !backreferenceAlwaysAfterGroup(element) || isPotentiallyEmpty(element.resolved, options);
			}

		case "Character":
		case "CharacterClass":
		case "CharacterSet":
			return false;

		case "CapturingGroup":
		case "Group":
			return isPotentiallyEmpty(element.alternatives, options);

		case "Quantifier":
			return element.min === 0 || isPotentiallyEmpty(element.element, options);

		default:
			throw assertNever(element);
	}
}

/**
 * Returns whether any of the ancestors of the given node fulfills the given condition.
 *
 * The ancestors will be iterated in the order from closest to farthest.
 * The condition function will not be called on the given node.
 */
export function hasSomeAncestor(node: Node, conditionFn: (ancestor: BranchNode) => boolean): boolean {
	let parent: Node["parent"] = node.parent;
	while (parent) {
		if (conditionFn(parent)) {
			return true;
		}
		parent = parent.parent;
	}
	return false;
}

export type Descendants<T> = T | (T extends Node ? RealDescendants<T> : never);
type RealDescendants<T extends Node> = T extends
	| Alternative
	| CapturingGroup
	| Group
	| LookaroundAssertion
	| Quantifier
	| Pattern
	? Element | CharacterClassElement
	: never | T extends CharacterClass
	? CharacterClassElement
	: never | T extends CharacterClassRange
	? Character
	: never | T extends RegExpLiteral
	? Flags | Pattern | Element | CharacterClassElement
	: never;

/**
 * Returns whether any of the descendants of the given node fulfill the given condition.
 *
 * The descendants will be iterated in a DFS top-to-bottom manner from left to right with the first node being the
 * given node.
 *
 * This function is short-circuited, so as soon as any `conditionFn` returns `true`, `true` will be returned.
 *
 * @param node
 * @param conditionFn
 * @param descentConditionFn An optional function to decide whether the descendant of the given node will be checked as
 * well.
 */
export function hasSomeDescendant<T extends Node>(
	node: T & Node,
	conditionFn: (descendant: Descendants<T>) => boolean,
	descentConditionFn?: (descendant: Descendants<T>) => boolean
): boolean {
	if (conditionFn(node)) {
		return true;
	}

	if (descentConditionFn && !descentConditionFn(node)) {
		return false;
	}

	switch (node.type) {
		case "Alternative":
			return node.elements.some(e => hasSomeDescendant(e, conditionFn, descentConditionFn));
		case "Assertion":
			if (node.kind === "lookahead" || node.kind === "lookbehind") {
				return node.alternatives.some(a => hasSomeDescendant(a, conditionFn, descentConditionFn));
			}
			return false;
		case "CapturingGroup":
		case "Group":
		case "Pattern":
			return node.alternatives.some(a => hasSomeDescendant(a, conditionFn, descentConditionFn));
		case "CharacterClass":
			return node.elements.some(e => hasSomeDescendant(e, conditionFn, descentConditionFn));
		case "CharacterClassRange":
			return (
				hasSomeDescendant(node.min, conditionFn, descentConditionFn) ||
				hasSomeDescendant(node.max, conditionFn, descentConditionFn)
			);
		case "Quantifier":
			return hasSomeDescendant(node.element, conditionFn, descentConditionFn);
		case "RegExpLiteral":
			return (
				hasSomeDescendant(node.pattern, conditionFn, descentConditionFn) ||
				hasSomeDescendant(node.flags, conditionFn, descentConditionFn)
			);
	}
	return false;
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

/**
 * Returns whether two nodes are semantically equivalent.
 */
export function areEqual(x: Node | null, y: Node | null): boolean {
	if (x == y) {
		return true;
	}
	if (!x || !y || x.type != y.type) {
		return false;
	}

	function manyAreEqual(a: Node[], b: Node[]): boolean {
		if (a.length !== b.length) {
			return false;
		}
		for (let i = 0; i < a.length; i++) {
			if (!areEqual(a[i], b[i])) {
				return false;
			}
		}
		return true;
	}
	function alternativesAreEqual(a: { alternatives: Alternative[] }, b: { alternatives: Alternative[] }): boolean {
		return manyAreEqual(a.alternatives, b.alternatives);
	}

	switch (x.type) {
		case "Alternative": {
			const other = y as Alternative;
			return manyAreEqual(x.elements, other.elements);
		}

		case "Assertion": {
			const other = y as Assertion;

			if (x.kind === other.kind) {
				if (x.kind === "lookahead" || x.kind === "lookbehind") {
					const otherLookaround = y as LookaroundAssertion;
					return x.negate === otherLookaround.negate && alternativesAreEqual(x, otherLookaround);
				} else {
					return x.raw === other.raw;
				}
			}
			return false;
		}

		case "Backreference": {
			const other = y as Backreference;
			return areEqual(x.resolved, other.resolved);
		}

		case "CapturingGroup": {
			const other = y as CapturingGroup;

			const p1 = getPattern(x);
			const p2 = getPattern(other);
			if (p1 && p2) {
				const n1 = getCapturingGroupNumber(p1, x);
				const n2 = getCapturingGroupNumber(p2, other);
				if (n1 && n2) {
					return n1 === n2 && alternativesAreEqual(x, other);
				}
			}
			return false;
		}

		case "Character": {
			const other = y as Character;
			return x.value === other.value;
		}

		case "CharacterClass": {
			const other = y as CharacterClass;
			return x.negate === other.negate && manyAreEqual(x.elements, other.elements);
		}

		case "CharacterClassRange": {
			const other = y as CharacterClassRange;
			return areEqual(x.min, other.min) && areEqual(x.max, other.max);
		}

		case "CharacterSet": {
			const other = y as CharacterSet;

			if (x.kind === "property" && other.kind === "property") {
				return x.negate === other.negate && x.key === other.key;
			} else {
				return x.raw === other.raw;
			}
		}

		case "Flags": {
			const other = y as Flags;
			return (
				x.dotAll === other.dotAll &&
				x.global === other.global &&
				x.ignoreCase === other.ignoreCase &&
				x.multiline === other.multiline &&
				x.sticky === other.sticky &&
				x.unicode === other.unicode
			);
		}

		case "Group":
		case "Pattern": {
			const other = y as Group;
			return alternativesAreEqual(x, other);
		}

		case "Quantifier": {
			const other = y as Quantifier;
			return (
				x.min === other.min &&
				x.max === other.max &&
				x.greedy === other.greedy &&
				areEqual(x.element, other.element)
			);
		}

		case "RegExpLiteral": {
			const other = y as RegExpLiteral;
			return areEqual(x.flags, other.flags) && areEqual(x.pattern, other.pattern);
		}

		default:
			throw assertNever(x);
	}
}

export function getCapturingGroupNumber(pattern: Pattern, group: CapturingGroup): number | null {
	let found = 0;
	try {
		visitRegExpAST(pattern, {
			onCapturingGroupEnter(node) {
				found++;
				if (node === group) {
					// throw an error to end early
					throw new Error();
				}
			},
		});
		return null;
	} catch (error) {
		return found;
	}
}

export function getPattern(node: Node): Pattern | null {
	switch (node.type) {
		case "Pattern":
			return node;
		case "RegExpLiteral":
			return node.pattern;
		case "Flags":
			return node.parent ? node.parent.pattern : null;
		default:
			return getPattern(node.parent);
	}
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

export function nodeAt(root: Node, index: number): Node | undefined {
	if (index < root.start || root.end >= index) {
		return undefined;
	}
	if (root.start == index) {
		return root;
	}

	switch (root.type) {
		case "Assertion":
		case "CapturingGroup":
		case "Group":
		case "Pattern":
			if (root.type === "Assertion" && !(root.kind === "lookahead" || root.kind === "lookbehind")) {
				break;
			}

			for (const alt of root.alternatives) {
				if (alt.end >= index) {
					break;
				}
				const result = nodeAt(alt, index);
				if (result) {
					return result;
				}
			}
			break;

		case "Quantifier": {
			const res = nodeAt(root.element, index);
			if (res) {
				return res;
			}
			break;
		}

		case "RegExpLiteral": {
			let res = nodeAt(root.flags, index);
			if (res) {
				return res;
			}
			res = nodeAt(root.pattern, index);
			if (res) {
				return res;
			}
			break;
		}

		default:
			break;
	}

	return root;
}

/**
 * Throws an error when invoked.
 */
export function assertNever(value: never): never {
	throw new Error(`This part of the code should never be reached but ${value} made it through.`);
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

type SimpleImpl<T> = Omit<T, "parent" | "start" | "end">;
export type Simple<T extends CharacterClassElement | AnyCharacterSet> = T extends Character
	? SimpleImpl<Character>
	: never | T extends UnicodePropertyCharacterSet
	? SimpleImpl<UnicodePropertyCharacterSet>
	: never | T extends AnyCharacterSet
	? SimpleImpl<AnyCharacterSet>
	: never | T extends EscapeCharacterSet
	? SimpleImpl<EscapeCharacterSet>
	: never | T extends CharacterClassRange
	? {
			type: "CharacterClassRange";
			min: Simple<Character>;
			max: Simple<Character>;
			raw: string;
	  }
	: never;

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

/**
 * Returns whether the given backreference will always be replaced with the empty string.
 */
export function isEmptyBackreference(backreference: Backreference): boolean {
	const group = backreference.resolved;

	if (hasSomeAncestor(backreference, a => a === group)) {
		// if the backreference is element of the referenced group
		return true;
	}

	if (isZeroLength(group)) {
		// If the referenced group can only match doesn't consume characters, then it can only capture the empty
		// string.
		return true;
	}

	// Now for the hard part:
	// If there exists a path through the regular expression which connect the group and the backreference, then
	// the backreference can capture the group iff we only move up, down, or right relative to the group.

	function findBackreference(node: Element): boolean {
		const parent = node.parent;

		switch (parent.type) {
			case "Alternative": {
				// if any elements right to the given node contain or are the backreference, we found it.
				const index = parent.elements.indexOf(node);

				// we have to take the current matching direction into account
				let next;
				if (matchingDirection(node) === "ltr") {
					// the next elements to match will be right to the given node
					next = parent.elements.slice(index + 1);
				} else {
					// the next elements to match will be left to the given node
					next = parent.elements.slice(0, index);
				}

				if (next.some(e => hasSomeDescendant(e, d => d === backreference))) {
					return true;
				}

				// no luck. let's go up!
				const parentParent = parent.parent;
				if (parentParent.type === "Pattern") {
					// can't go up.
					return false;
				} else {
					return findBackreference(parentParent);
				}
			}

			case "Quantifier":
				return findBackreference(parent);

			default:
				throw new Error("What happened?");
		}
	}

	return !findBackreference(group);
}

/**
 * Returns whether the given backreference is always matched __after__ the referenced group was matched.
 *
 * If there exists any accepting path which goes through the backreference but not through the referenced group,
 * this will return `false`.
 */
export function backreferenceAlwaysAfterGroup(backreference: Backreference): boolean {
	const group = backreference.resolved;

	if (hasSomeAncestor(backreference, a => a === group)) {
		// if the backreference is element of the referenced group
		return false;
	}

	function findBackreference(node: Element): boolean {
		const parent = node.parent;

		switch (parent.type) {
			case "Alternative": {
				// if any elements right to the given node contain or are the backreference, we found it.
				const index = parent.elements.indexOf(node);

				// we have to take the current matching direction into account
				let next;
				if (matchingDirection(node) === "ltr") {
					// the next elements to match will be right to the given node
					next = parent.elements.slice(index + 1);
				} else {
					// the next elements to match will be left to the given node
					next = parent.elements.slice(0, index);
				}

				if (next.some(e => hasSomeDescendant(e, d => d === backreference))) {
					return true;
				}

				// no luck. let's go up!
				const parentParent = parent.parent;
				if (parentParent.type === "Pattern") {
					// can't go up.
					return false;
				} else {
					if (parentParent.alternatives.length > 1) {
						// e.g.: (?:a|(a))+b\1
						return false;
					}
					return findBackreference(parentParent);
				}
			}

			case "Quantifier":
				if (parent.min === 0) {
					// e.g.: (a+)?b\1
					return false;
				}
				return findBackreference(parent);

			default:
				throw new Error("What happened?");
		}
	}

	return findBackreference(group);
}

/**
 * Returns the raw string of the quantifier without the quantified element.
 *
 * E.g. for `a+?`, `+?` will be returned.
 */
export function getQuantifierRaw(quantifier: Quantifier): string {
	return quantifier.raw.substr(quantifier.element.end - quantifier.start);
}

export type MatchingDirection = "ltr" | "rtl";
/**
 * Returns the direction which which the given node will be matched relative to the closest parent alternative.
 */
export function matchingDirection(node: Node): MatchingDirection {
	let closestLookaround: LookaroundAssertion | undefined;
	hasSomeAncestor(node, a => {
		if (a.type === "Assertion") {
			closestLookaround = a;
			return true;
		}
		return false;
	});

	if (closestLookaround !== undefined && closestLookaround.kind === "lookbehind") {
		// the matching direction in a lookbehind is right to left
		return "rtl";
	}
	// the standard matching direction is left to right
	return "ltr";
}

/**
 * `lookahead` is here equivalent to `ltr` and `lookbehind` is equivalent to `rtl`.
 */
export function invertMatchingDirection(direction: LookaroundAssertion["kind"] | MatchingDirection): MatchingDirection {
	return direction === "ltr" || direction === "lookahead" ? "rtl" : "ltr";
}

/**
 * Returns whether the given element contains or is an assertion that looks into the given direction.
 *
 * `lookahead` is here equivalent to `ltr` and `lookbehind` is equivalent to `rtl`.
 */
export function hasAssertionWithDirection(
	element: Element,
	direction: LookaroundAssertion["kind"] | MatchingDirection
): boolean {
	return hasSomeDescendant(element, d => {
		if (d.type === "Assertion") {
			if (d.kind === "word") {
				// word is both a lookahead and a lookbehind
				return true;
			}
			if (isPotentiallyEmpty(element)) {
				// we can generally completely ignore empty lookarounds, they are just dead code
				return false;
			}

			if (direction === "lookahead" || direction === "ltr") {
				return d.kind === "lookahead" || d.kind === "end";
			} else {
				return d.kind === "lookbehind" || d.kind === "start";
			}
		}
		return false;
	});
}

export function toCharSet(
	elements: (Simple<CharacterClassElement> | Simple<CharacterSet>)[] | CharacterClass,
	flags: Partial<Flags>
): CharSet {
	if (Array.isArray(elements)) {
		return JS.createCharSet(
			elements.map(e => {
				switch (e.type) {
					case "Character":
						return e.value;
					case "CharacterClassRange":
						return { min: e.min.value, max: e.max.value };
					case "CharacterSet":
						return e;
					default:
						throw assertNever(e);
				}
			}),
			flags
		);
	} else {
		const chars = toCharSet(elements.elements, flags);
		if (elements.negate) {
			return chars.negate();
		}
		return chars;
	}
}

const EMPTY_UTF16_CHARSET = CharSet.empty(0xffff);
const EMPTY_UNICODE_CHARSET = CharSet.empty(0x10ffff);
/**
 * Returns an empty character set for the given flags.
 */
export function emptyCharSet(flags: Partial<Flags>): CharSet {
	if (flags.unicode) {
		return EMPTY_UNICODE_CHARSET;
	} else {
		return EMPTY_UTF16_CHARSET;
	}
}

/**
 * Returns how many characters the given element can consume at most and has to consume at least.
 */
export function getLengthRange(element: Element | Alternative | Alternative[]): { min: number; max: number } {
	if (Array.isArray(element)) {
		let min = 0;
		let max = 0;

		for (const e of element) {
			const eRange = getLengthRange(e);
			min += eRange.min;
			max += eRange.max;
		}

		return { min, max };
	}

	switch (element.type) {
		case "Assertion":
			return { min: 0, max: 0 };

		case "Character":
		case "CharacterClass":
		case "CharacterSet":
			return { min: 1, max: 1 };

		case "Quantifier": {
			if (element.max === 0) {
				return { min: 0, max: 0 };
			}
			const elementRange = getLengthRange(element.element);
			if (elementRange.max === 0) {
				return { min: 0, max: 0 };
			}
			if (element.min === 0) {
				elementRange.min = 0;
			}
			if (element.max === Infinity) {
				elementRange.max = Infinity;
			}
			return elementRange;
		}

		case "Alternative": {
			let min = 0;
			let max = 0;

			for (const e of element.elements) {
				const eRange = getLengthRange(e);
				min += eRange.min;
				max += eRange.max;
			}

			return { min, max };
		}

		case "CapturingGroup":
		case "Group":
			return getLengthRange(element.alternatives);

		case "Backreference": {
			if (isEmptyBackreference(element)) {
				return { min: 0, max: 0 };
			}
			const resolvedRange = getLengthRange(element.resolved);
			if (resolvedRange.min > 0 && !backreferenceAlwaysAfterGroup(element)) {
				resolvedRange.min = 0;
			}
			return resolvedRange;
		}

		default:
			throw assertNever(element);
	}
}

/**
 * If a character is returned, it guaranteed to be a super set of the actual character. If the given element is
 * always of zero length, then the empty character set will be returned.
 *
 * If `exact` is `true` then it is guaranteed that the returned character is guaranteed to be the actual
 * character at all times if this element is not influenced by lookarounds outside itself.
 */
export function getFirstCharOf(
	element: Element | Alternative | Alternative[],
	direction: MatchingDirection,
	flags: Flags
): FirstChar {
	if (Array.isArray(element)) {
		let nonEmpty = true;
		let exact = true;
		let char = emptyCharSet(flags);

		for (const alt of element) {
			const altChar = getFirstCharOf(alt, direction, flags);
			char = char.union(altChar.char);
			nonEmpty = nonEmpty && altChar.nonEmpty;
			exact = exact && altChar.exact;
		}

		return { char, nonEmpty, exact };
	}

	switch (element.type) {
		case "Assertion":
			return { char: emptyCharSet(flags), nonEmpty: false, exact: true };

		case "Character":
		case "CharacterSet":
			return { char: toCharSet([element], flags), nonEmpty: true, exact: true };

		case "CharacterClass":
			return { char: toCharSet(element, flags), nonEmpty: true, exact: true };

		case "Quantifier": {
			if (element.max === 0) {
				return { char: emptyCharSet(flags), nonEmpty: false, exact: true };
			}
			const elementChar = getFirstCharOf(element.element, direction, flags);
			let exact = elementChar.exact;
			if (exact && element.max > 1 && hasAssertionWithDirection(element, invertMatchingDirection(direction))) {
				// This is a conservative approximation!
				// The main idea here is that the first char of element of /((?<!a)\w)+/ is exactly \w
				// but the lookbehind will influence \w, so \w isn't exact.
				exact = false;
			}
			return {
				char: elementChar.char,
				nonEmpty: elementChar.nonEmpty && element.min > 0,
				exact: exact,
			};
		}

		case "Alternative": {
			let elements = element.elements;
			if (direction === "rtl") {
				elements = [...elements];
				elements.reverse();
			}

			let nonEmpty = false;
			let exact = true;
			let char = emptyCharSet(flags);
			for (let i = 0; i < elements.length; i++) {
				const e = elements[i];
				const eChar = getFirstCharOf(e, direction, flags);
				char = char.union(eChar.char);
				exact = exact && eChar.exact;

				if (eChar.nonEmpty) {
					nonEmpty = true;
					if (exact) {
						const rest = elements.slice(i + 1);
						const invDir = invertMatchingDirection(direction);
						if (rest.some(r => hasAssertionWithDirection(r, invDir))) {
							// This is a conservative approximation!
							// Example: /\w(?<=a)/
							exact = false;
						}
					}
					break;
				} else {
					if (hasAssertionWithDirection(e, direction)) {
						// This is a conservative approximation!
						// Example: /(?=a)\w/
						exact = false;
					}
				}
			}

			return { char, nonEmpty, exact };
		}

		case "CapturingGroup":
		case "Group":
			return getFirstCharOf(element.alternatives, direction, flags);

		case "Backreference": {
			if (isEmptyBackreference(element)) {
				return { char: emptyCharSet(flags), nonEmpty: false, exact: true };
			}
			const resolvedChar = getFirstCharOf(element.resolved, direction, flags);

			let exact = resolvedChar.exact;
			if (exact) {
				// the resolved character is only exact if it is only a single character.
				// i.e. /(\w)\1/ here the (\w) will capture exactly any word character, but the \1 can only match
				// one word character and that is the only (\w) matched.
				exact = resolvedChar.char.size === 1;
			}

			return {
				char: resolvedChar.char,
				nonEmpty: resolvedChar.nonEmpty && backreferenceAlwaysAfterGroup(element),
				exact,
			};
		}

		default:
			throw assertNever(element);
	}
}

/**
 * Returns the first character after the given element.
 *
 * What "after" means depends the on the given direction which will be interpreted as the current matching
 * direction. You can use this to get the previous character of an element as well.
 *
 * All restrictions and limitation of `getFirstCharOf` apply.
 */
export function getFirstCharAfter(afterThis: Element, direction: MatchingDirection, flags: Flags): FirstChar {
	function advanceElement(element: Element, direction: MatchingDirection): (Element | "end")[] {
		const parent = element.parent;
		if (parent.type === "CharacterClass" || parent.type === "CharacterClassRange") {
			throw new Error("The given element cannot be part of a character class.");
		}

		if (parent.type === "Quantifier") {
			if (parent.max <= 1) {
				return advanceElement(parent, direction);
			}
			return [parent, ...advanceElement(parent, direction)];
		} else {
			let altElements = parent.elements;
			if (direction === "rtl") {
				altElements = [...altElements];
				altElements.reverse();
			}

			const index = altElements.indexOf(element);
			if (index === altElements.length - 1) {
				// last element
				const parentParent = parent.parent;
				if (parentParent.type === "Pattern") {
					// there's nothing after that
					return ["end"];
				}
				if (parentParent.type === "Assertion") {
					// handling this too is waaay too complex, so let's just bail
					return ["end"];
				}
				if (parentParent.type === "CapturingGroup" || parentParent.type === "Group") {
					return advanceElement(parentParent, direction);
				}
				throw assertNever(parentParent);
			} else {
				// there are still some elements after this one
				return [altElements[index + 1]];
			}
		}
	}

	let nonEmpty = true;
	let exact = true;
	let char = emptyCharSet(flags);

	let nextElements = advanceElement(afterThis, direction);
	while (nextElements.length > 0) {
		const elements = nextElements;
		nextElements = [];

		for (const element of elements) {
			if (element === "end") {
				nonEmpty = false;
			} else {
				const firstChar = getFirstCharOf(element, direction, flags);
				char = char.union(firstChar.char);
				exact = exact && firstChar.exact;
				if (!firstChar.nonEmpty) {
					// keep going
					nextElements.push(...advanceElement(element, direction));
				}
			}
		}
	}

	return { char, nonEmpty, exact };
}

/**
 * Returns whether the given character class/set matches all characters.
 */
export function isMatchAll(char: CharacterClass | CharacterSet, flags: Flags): boolean {
	if (char.type === "CharacterSet") {
		if (char.kind === "property") {
			return JS.createCharSet([char], flags).isAll;
		} else if (char.kind === "any") {
			return flags.dotAll;
		} else {
			return false;
		}
	} else {
		if (char.negate && char.elements.length === 0) {
			return true;
		} else {
			if (char.negate) {
				return toCharSet(char.elements, flags).isEmpty;
			} else {
				return toCharSet(char.elements, flags).isAll;
			}
		}
	}
}

/**
 * Returns whether the given character class/set matches no characters.
 */
export function isMatchNone(char: CharacterClass | CharacterSet, flags: Flags): boolean {
	if (char.type === "CharacterSet") {
		if (char.kind === "property") {
			return JS.createCharSet([char], flags).isEmpty;
		} else {
			return false;
		}
	} else {
		if (!char.negate && char.elements.length === 0) {
			return true;
		} else {
			if (char.negate) {
				return toCharSet(char.elements, flags).isAll;
			} else {
				return toCharSet(char.elements, flags).isEmpty;
			}
		}
	}
}

/**
 * Returns how many times the regex engine may match the given node against a string.
 */
export function effectiveQuantifierMax(node: Node | null): number {
	if (node == null) {
		return 1;
	} else {
		const parent = effectiveQuantifierMax(node.parent);
		if (node.type === "Quantifier") {
			if (node.max === 0 || parent === 0) {
				return 0;
			} else {
				return parent * node.max;
			}
		} else {
			return parent;
		}
	}
}
/**
 * Returns whether the given node either is or is under an effectively star quantifier.
 *
 * All quantifiers with a max larger than a certain threshold are assumed to have a max of infinity.
 */
export function underAStar(node: Node): boolean {
	return effectiveQuantifierMax(node) > 20;
}

/**
 * Returns whether the languages of the given NFA are equal.
 *
 * This assumes that both NFA do not have unreachable or trap states.
 */
export function nfaEquals(a: ReadonlyNFA, b: ReadonlyNFA): boolean {
	if (a.isEmpty || b.isEmpty) {
		return a.isEmpty === b.isEmpty;
	}
	if (a.options.maxCharacter !== b.options.maxCharacter) {
		return false;
	}

	const { maxCharacter } = a.options;
	const x = a.nodes;
	const y = b.nodes;

	if (x.finals.has(x.initial) !== y.finals.has(y.initial)) {
		// one accepts the empty word, the other one doesn't
		return false;
	}

	function unionAll(iter: Iterable<CharSet>): CharSet {
		let total: CharSet | undefined = undefined;

		for (const item of iter) {
			if (total === undefined) {
				total = item;
			} else {
				total = total.union(item);
			}
		}

		return total || CharSet.empty(maxCharacter);
	}

	if (!unionAll(x.initial.out.values()).equals(unionAll(y.initial.out.values()))) {
		// first characters of the accepted languages are different
		return false;
	}

	const aDfa = DFA.fromFA(a);
	aDfa.minimize();
	const bDfa = DFA.fromFA(b);
	bDfa.minimize();

	return aDfa.structurallyEqual(bDfa);
}
export function nfaIsSupersetOf(superset: ReadonlyNFA, subset: ReadonlyNFA): boolean {
	const union = superset.copy();
	union.union(subset);
	return nfaEquals(union, superset);
}
export function nfaIsSubsetOf(subset: ReadonlyNFA, superset: ReadonlyNFA): boolean {
	return nfaIsSupersetOf(superset, subset);
}
export function nfaUnionAll(nfas: Iterable<ReadonlyNFA>, options: Readonly<NFA.Options>): NFA {
	const total = NFA.empty(options);
	for (const nfa of nfas) {
		total.union(nfa);
	}
	return total;
}

export function findIndex<T>(arr: readonly T[], condFn: (item: T, index: number) => boolean): number {
	return arr.findIndex(condFn);
}
export function findLastIndex<T>(arr: readonly T[], condFn: (item: T, index: number) => boolean): number {
	for (let i = arr.length - 1; i >= 0; i--) {
		if (condFn(arr[i], i)) {
			return i;
		}
	}
	return -1;
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
