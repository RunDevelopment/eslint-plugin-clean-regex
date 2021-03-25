import { CharSet } from "refa";
import { visitRegExpAST, AST } from "regexpp";
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
	EscapeCharacterSet,
	UnicodePropertyCharacterSet,
	BranchNode,
	CharacterClassRange,
	RegExpLiteral,
	EdgeAssertion,
} from "regexpp/ast";
import { allCharSet, emptyCharSet, lineTerminatorCharSet, toCharSet } from "./char-util";
import { assertNever, Simple } from "./util";

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
export function assertionKindToMatchingDirection(
	kind: LookaroundAssertion["kind"] | EdgeAssertion["kind"]
): MatchingDirection {
	return kind === "end" || kind === "lookahead" ? "ltr" : "rtl";
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

/**
 * Returns how many characters the given element can consume at most and has to consume at least.
 *
 * If `undefined`, then the given element can't consume any characters.
 */
export function getLengthRange(
	element: Element | Alternative | Alternative[]
): { min: number; max: number } | undefined {
	if (Array.isArray(element)) {
		let min = Infinity;
		let max = 0;

		for (const e of element) {
			const eRange = getLengthRange(e);
			if (eRange) {
				min = Math.min(min, eRange.min);
				max = Math.max(max, eRange.max);
			}
		}

		if (min > max) {
			return undefined;
		} else {
			return { min, max };
		}
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
			if (!elementRange) {
				return element.min === 0 ? { min: 0, max: 0 } : undefined;
			}

			if (elementRange.max === 0) {
				return { min: 0, max: 0 };
			}
			elementRange.min *= element.min;
			elementRange.max *= element.max;
			return elementRange;
		}

		case "Alternative": {
			let min = 0;
			let max = 0;

			for (const e of element.elements) {
				const eRange = getLengthRange(e);
				if (!eRange) {
					return undefined;
				}
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
			if (!resolvedRange) {
				return backreferenceAlwaysAfterGroup(element) ? undefined : { min: 0, max: 0 };
			}

			if (resolvedRange.min > 0 && !backreferenceAlwaysAfterGroup(element)) {
				resolvedRange.min = 0;
			}
			return resolvedRange;
		}

		default:
			throw assertNever(element);
	}
}

export interface FirstLookChar {
	/**
	 * A super set of the first character.
	 *
	 * We can usually only guarantee a super set because lookaround in the pattern may narrow down the actual character
	 * set.
	 */
	char: CharSet;
	/**
	 * If `true`, then the first character can be the start/end of the string.
	 */
	edge: boolean;
	/**
	 * If `true`, then `char` is guaranteed to be exactly the first character and not just a super set of it.
	 */
	exact: boolean;
}
export type FirstConsumedChar = FirstFullyConsumedChar | FirstPartiallyConsumedChar;
/**
 * This is equivalent to a regex fragment `[char]`.
 */
export interface FirstFullyConsumedChar {
	/**
	 * A super set of the first character.
	 *
	 * We can usually only guarantee a super set because lookaround in the pattern may narrow down the actual character
	 * set.
	 */
	char: CharSet;
	/**
	 * If `true`, then the first character also includes the empty word.
	 */
	empty: false;
	/**
	 * If `true`, then `char` is guaranteed to be exactly the first character and not just a super set of it.
	 */
	exact: boolean;
}
/**
 * This is equivalent to a regex fragment `[char]|(?=[look.char])` or `[char]|(?=[look.char]|$)` depending on
 * `look.edge`.
 */
export interface FirstPartiallyConsumedChar {
	/**
	 * A super set of the first character.
	 *
	 * We can usually only guarantee a super set because lookaround in the pattern may narrow down the actual character
	 * set.
	 */
	char: CharSet;
	/**
	 * If `true`, then the first character also includes the empty word.
	 */
	empty: true;
	/**
	 * If `true`, then `char` is guaranteed to be exactly the first character and not just a super set of it.
	 */
	exact: boolean;
	/**
	 * A set of characters that may come after the consumed character
	 */
	look: FirstLookChar;
}

/**
 * If a character is returned, it guaranteed to be a super set of the actual character. If the given element is
 * always of zero length, then the empty character set will be returned.
 *
 * If `exact` is `true` then it is guaranteed that the returned character is guaranteed to be the actual
 * character at all times if this element is not influenced by lookarounds outside itself.
 */
export function getFirstCharConsumedBy(
	element: Element | Alternative | Alternative[],
	direction: MatchingDirection,
	flags: Flags
): FirstConsumedChar {
	if (Array.isArray(element)) {
		return firstConsumedCharUnion(
			element.map(e => getFirstCharConsumedBy(e, direction, flags)),
			flags
		);
	}

	switch (element.type) {
		case "Assertion":
			switch (element.kind) {
				case "word":
					return misdirectedAssertion();
				case "end":
				case "start":
					if (assertionKindToMatchingDirection(element.kind) === direction) {
						if (flags.multiline) {
							return lineAssertion();
						} else {
							return edgeAssertion();
						}
					} else {
						return misdirectedAssertion();
					}
				case "lookahead":
				case "lookbehind":
					if (assertionKindToMatchingDirection(element.kind) === direction) {
						if (element.negate) {
							// we can only meaningfully analyse negative lookarounds of the form `(?![a])`
							if (hasSomeDescendant(element, d => d !== element && d.type === "Assertion")) {
								return misdirectedAssertion();
							}
							const firstChar = getFirstCharConsumedBy(element.alternatives, direction, flags);
							const range = getLengthRange(element.alternatives);
							if (firstChar.empty || !range) {
								// trivially rejecting
								return { char: emptyCharSet(flags), empty: false, exact: true };
							}

							if (!firstChar.exact || range.max !== 1) {
								// the goal to to convert `(?![a])` to `(?=[^a]|$)` but this negation is only correct
								// if the characters are exact and if the assertion asserts at most one character
								// E.g. `(?![a][b])` == `(?=$|[^a]|[a][^b])`
								return misdirectedAssertion();
							} else {
								return emptyWord({ char: firstChar.char.negate(), edge: true, exact: true });
							}
						} else {
							const firstChar = getFirstCharConsumedBy(element.alternatives, direction, flags);
							return emptyWord(firstConsumedToLook(firstChar));
						}
					} else {
						return misdirectedAssertion();
					}
				default:
					throw assertNever(element);
			}

		case "Character":
		case "CharacterSet":
		case "CharacterClass":
			return { char: toCharSet(element, flags), empty: false, exact: true };

		case "Quantifier": {
			if (element.max === 0) {
				return emptyWord();
			}

			const firstChar = getFirstCharConsumedBy(element.element, direction, flags);
			if (element.min === 0) {
				return firstConsumedCharUnion([emptyWord(), firstChar], flags);
			} else {
				return firstChar;
			}
		}

		case "Alternative": {
			let elements = element.elements;
			if (direction === "rtl") {
				elements = [...elements];
				elements.reverse();
			}

			return firstConsumedCharConcat(
				(function* (): Iterable<FirstConsumedChar> {
					for (const e of elements) {
						yield getFirstCharConsumedBy(e, direction, flags);
					}
				})(),
				flags
			);
		}

		case "CapturingGroup":
		case "Group":
			return getFirstCharConsumedBy(element.alternatives, direction, flags);

		case "Backreference": {
			if (isEmptyBackreference(element)) {
				return emptyWord();
			}
			const resolvedChar = getFirstCharConsumedBy(element.resolved, direction, flags);

			// the resolved character is only exact if it is only a single character.
			// i.e. /(\w)\1/ here the (\w) will capture exactly any word character, but the \1 can only match
			// one word character and that is the only (\w) matched.
			resolvedChar.exact = resolvedChar.exact && resolvedChar.char.size <= 1;

			if (backreferenceAlwaysAfterGroup(element)) {
				return resolvedChar;
			} else {
				// there is at least one path through which the backreference will (possibly) be replaced with the
				// empty string
				return firstConsumedCharUnion([resolvedChar, emptyWord()], flags);
			}
		}

		default:
			throw assertNever(element);
	}

	/**
	 * The result for an assertion that (partly) assert for the wrong matching direction.
	 */
	function misdirectedAssertion(): FirstPartiallyConsumedChar {
		return emptyWord({
			char: allCharSet(flags),
			edge: true,
			// This is the important part.
			// Since the allowed chars depend on the previous chars, we don't know which will be allowed.
			exact: false,
		});
	}
	function edgeAssertion(): FirstPartiallyConsumedChar {
		return emptyWord(firstLookCharEdgeAccepting(flags));
	}
	function lineAssertion(): FirstPartiallyConsumedChar {
		return emptyWord({
			char: lineTerminatorCharSet(flags),
			edge: true,
			exact: true,
		});
	}
	function emptyWord(look?: FirstLookChar): FirstPartiallyConsumedChar {
		return firstConsumedCharEmptyWord(flags, look);
	}
}
/**
 * Returns first-look-char that is equivalent to a trivially-accepting lookaround.
 */
function firstLookCharTriviallyAccepting(flags: Flags): FirstLookChar {
	return { char: allCharSet(flags), edge: true, exact: true };
}
/**
 * Returns first-look-char that is equivalent to `/$/`.
 */
function firstLookCharEdgeAccepting(flags: Flags): FirstLookChar {
	return { char: emptyCharSet(flags), edge: true, exact: true };
}
/**
 * Returns first-consumed-char that is equivalent to consuming nothing (the empty word) followed by a trivially
 * accepting lookaround.
 */
function firstConsumedCharEmptyWord(flags: Flags, look?: FirstLookChar): FirstPartiallyConsumedChar {
	return {
		char: emptyCharSet(flags),
		empty: true,
		exact: true,
		look: look ?? firstLookCharTriviallyAccepting(flags),
	};
}
class CharUnion {
	char: CharSet;
	exact: boolean;
	private constructor(char: CharSet) {
		this.char = char;
		this.exact = true;
	}
	add(char: CharSet, exact: boolean): void {
		// basic idea here is that the union or an exact superset with an inexact subset will be exact
		if (this.exact && !exact && !this.char.isSupersetOf(char)) {
			this.exact = false;
		} else if (!this.exact && exact && char.isSupersetOf(this.char)) {
			this.exact = true;
		}

		this.char = this.char.union(char);
	}
	static emptyFromFlags(flags: Flags): CharUnion {
		return new CharUnion(emptyCharSet(flags));
	}
	static emptyFromMaximum(maximum: number): CharUnion {
		return new CharUnion(CharSet.empty(maximum));
	}
}
function firstConsumedCharUnion(iter: Iterable<Readonly<FirstConsumedChar>>, flags: Flags): FirstConsumedChar {
	const union = CharUnion.emptyFromFlags(flags);
	const looks: FirstLookChar[] = [];

	for (const itemChar of iter) {
		union.add(itemChar.char, itemChar.exact);
		if (itemChar.empty) {
			looks.push(itemChar.look);
		}
	}

	if (looks.length > 0) {
		// This means that the unioned elements look something like this:
		//   (a|(?=g)|b?|x)
		//
		// Adding the trivially accepting look after all all alternatives that can be empty, we'll get:
		//   (a|(?=g)|b?|x)
		//   (a|(?=g)|b?(?=[^]|$)|x)
		//   (a|(?=g)|b(?=[^]|$)|(?=[^]|$)|x)
		//
		// Since we are only interested in the first character, the look in `b(?=[^]|$)` can be removed.
		//   (a|(?=g)|b|(?=[^]|$)|x)
		//   (a|b|x|(?=g)|(?=[^]|$))
		//   ([abx]|(?=g)|(?=[^]|$))
		//
		// To union the looks, we can simply use the fact that `(?=a)|(?=b)` == `(?=a|b)`
		//   ([abx]|(?=g)|(?=[^]|$))
		//   ([abx]|(?=g|[^]|$))
		//   ([abx]|(?=[^]|$))
		//
		// And with that we are done. This is exactly the form of a first partial char. Getting the exactness of the
		// union of normal chars and look chars follows the same rules.

		const lookUnion = CharUnion.emptyFromFlags(flags);
		let edge = false;
		for (const look of looks) {
			lookUnion.add(look.char, look.exact);
			edge = edge || look.edge;
		}
		return {
			char: union.char,
			exact: union.exact,
			empty: true,
			look: { char: lookUnion.char, exact: lookUnion.exact, edge },
		};
	} else {
		return { char: union.char, exact: union.exact, empty: false };
	}
}
function firstConsumedCharConcat(iter: Iterable<Readonly<FirstConsumedChar>>, flags: Flags): FirstConsumedChar {
	const union = CharUnion.emptyFromFlags(flags);
	let look = firstLookCharTriviallyAccepting(flags);

	for (const item of iter) {
		union.add(item.char.intersect(look.char), look.exact && item.exact);

		if (item.empty) {
			// This is the hard case. We need to convert the expression
			//   (a|(?=b))(c|(?=d))
			// into an expression
			//   e|(?=f)
			// (we will completely ignore edge assertions for now)
			//
			// To do that, we'll use the following idea:
			//   (a|(?=b))(c|(?=d))
			//   a(c|(?=d))|(?=b)(c|(?=d))
			//   ac|a(?=d)|(?=b)c|(?=b)(?=d)
			//
			// Since we are only interested in the first char, we can remove the `c` in `ac` and the `(?=d)` in
			// `a(?=d)`. Furthermore, `(?=b)c` is a single char, so let's call it `C` for now.
			//   ac|a(?=d)|(?=b)c|(?=b)(?=d)
			//   a|a|C|(?=b)(?=d)
			//   [aC]|(?=b)(?=d)
			//   [aC]|(?=(?=b)d)
			//
			// This is *almost* the desired form. We now have to convert `(?=(?=b)d)` to an expression of the form
			// `(?=f)`. This is the point where we can't ignore edge assertions any longer. Let's look at all possible
			// cases and see how it plays out. Also, let `D` be the char intersection of `b` and `d`.
			//   (1) (?=(?=b)d)
			//       (?=D)
			//
			//   (2) (?=(?=b)(d|$))
			//       (?=(?=b)d|(?=b)$)
			//       (?=D)
			//
			//   (3) (?=(?=b|$)d)
			//       (?=((?=b)|$)d)
			//       (?=(?=b)d|$d)
			//       (?=D)
			//
			//   (4) (?=(?=b|$)(d|$))
			//       (?=((?=b)|$)(d|$))
			//       (?=(?=b)(d|$)|$(d|$))
			//       (?=(?=b)d|(?=b)$|$d|$$)
			//       (?=D|$)
			//
			// As we can see, the look char is always `D` and the edge is only accepted if it's accepted by both.

			const charIntersection = look.char.intersect(item.look.char);
			look = {
				char: charIntersection,
				exact: (look.exact && item.look.exact) || charIntersection.isEmpty,
				edge: look.edge && item.look.edge,
			};
		} else {
			return { char: union.char, exact: union.exact, empty: false };
		}
	}
	return { char: union.char, exact: union.exact, empty: true, look };
}
/**
 * This wraps the first-consumed-char object in a look.
 */
function firstConsumedToLook(first: Readonly<FirstConsumedChar>): FirstLookChar {
	if (first.empty) {
		// We have 2 cases:
		//   (1) (?=a|(?=b))
		//       (?=a|b)
		//       (?=[ab])
		//   (2) (?=a|(?=b|$))
		//       (?=a|b|$)
		//       (?=[ab]|$)
		const union = CharUnion.emptyFromMaximum(first.char.maximum);
		union.add(first.char, first.exact);
		union.add(first.look.char, first.look.exact);

		return {
			char: union.char,
			exact: union.exact,
			edge: first.look.edge,
		};
	} else {
		// It's already in the correct form:
		//   (?=a)
		return {
			char: first.char,
			exact: first.exact,
			edge: false,
		};
	}
}

export interface FollowOperations<S> {
	/**
	 * Split off a new path from the given one.
	 *
	 * The given state should not be modified. If the state is immutable, then `fork` may be implemented as the identify
	 * function in regard to `state`.
	 */
	fork(state: S, direction: MatchingDirection): S;
	/**
	 * Joins any number but of paths to create a combined path.
	 */
	join(states: S[], direction: MatchingDirection): S;
	/**
	 * This function is called when dealing to general lookarounds (it will __not__ be called for predefined assertion -
	 * `^`, `$`, `\b`, `\B`).
	 */
	assert?: (state: S, direction: MatchingDirection, assertion: S, assertionDirection: MatchingDirection) => S;

	enter?: (element: Element, state: S, direction: MatchingDirection) => S;
	leave?: (element: Element, state: S, direction: MatchingDirection) => S;
	endPath?: (state: S, direction: MatchingDirection, reason: "pattern" | "assertion") => S;

	/**
	 * Whether the current path should go into the given element (return `true`) or whether it should be skipped
	 * (return `false`). If the element is skipped, the given state will not be changed and passed as-is to the `leave`
	 * function.
	 *
	 * You shouldn't modify state in this function. Modify state in the `enter` function instead.
	 */
	continueInto?: (element: Element, state: S, direction: MatchingDirection) => boolean;
	/**
	 * Whether the current path should continue after the given element (return `true`) or whether all elements that
	 * follow this element should be skipped (return `false`).
	 *
	 * If the current path is a fork path, then only the elements until the fork is joined will be skipped. A stopped
	 * fork path will be joined with all other forks like normal.
	 *
	 * You shouldn't modify state in this function. Modify state in the `leave` function instead.
	 */
	continueAfter?: (element: Element, state: S, direction: MatchingDirection) => boolean;
}
/**
 * This function goes to all elements reachable from the given `start`.
 *
 * ## Paths
 *
 * The function uses _paths_ for this. A path is an [execution path](https://en.wikipedia.org/wiki/Symbolic_execution)
 * that is described by a sequence of regex elements.
 *
 * I.e. there are two paths to go from `a` to `b` in the pattern `/a(\w|dd)b/`. The first path is `a \w b` and the
 * second path is `a d d b`.
 *
 * However, the problem with paths is that there can be exponentially many because of combinatorial explosion (e.g. the
 * pattern `/(a|b)(a|b)(a|b)(a|b)(a|b)/` has 32 paths). To solve this problem, this function will _join_ paths together
 * again.
 *
 * I.e. In the pattern `/a(\w|dd)b/`, first element of all paths will be `a`. After `a`, the path splits into two. We
 * call each of the split paths a _fork_. The two forks will be `a ( \w` and `a ( d d`. The `(` is used to indicate that
 * a fork was made. Since both paths come together after the group ends, they will be _joined_. The joined path of
 * `a ( \w` and `a ( d d` will be written as `a ( \w | d d )`. The `)` is used to indicate that forks have been joined.
 * The final path will be `a ( \w | d d ) b`.
 *
 * This method of forking and joining works for alternations but it won't work for quantifiers. This is why quantifiers
 * will be treated as single elements that can be entered. By default, a quantifier `q` will be interpreted as `( q | )`
 * if its minimum is zero and as `( q )` otherwise.
 *
 * ### State
 *
 * Paths are thought of as a sequence of elements and they are represented by state (type parameter `S`). All operations
 * that fork, join, or assert paths will operate on state and not a sequence of elements.
 *
 * State allows flow operations to be implemented more efficiently and ensures that only necessary data is passed
 * around. Flow analysis for paths usually tracks properties and analyses how these properties change, the current
 * values of these properties is state.
 *
 * ## Flow operations
 *
 * Flow operations are specific to the type of the state and act upon the state. The define how the state of paths
 * changes when encountering elements and how paths fork, join, and continue.
 *
 * ### Operation sequence
 *
 * To follow all paths, two operations are necessary: one operations that enters elements and one that determines the
 * next element. These operations will be called `Enter` and `Next` respectively. The operation will call the given
 * flow operations like this:
 *
 * ```txt
 * function Enter(element, state):
 *     operations.enter
 *     if operations.continueInto:
 *         if elementType == GROUP:
 *             operations.join(
 *                 alternatives.map(e => Enter(e, operations.fork(state)))
 *             )
 *         if elementType == QUANTIFIER:
 *             if quantifierMin == 0:
 *                 operations.join([
 *                     state,
 *                     Enter(quantifier, operations.fork(state))
 *                 ])
 *         if elementType == LOOKAROUND:
 *             operations.assert(
 *                 state,
 *                 operations.join(
 *                     alternatives.map(e => Enter(e, operations.fork(state)))
 *                 )
 *             )
 *     operations.leave
 *     Next(element, state)
 *
 * function Next(element, state):
 *     if operations.continueAfter:
 *         if noNextElement:
 *             operations.endPath
 *         else:
 *             Enter(nextElement, state)
 * ```
 *
 * (This is just simplified pseudo code but the general order of operations will be the same.)
 *
 * ## Runtime
 *
 * If `n` elements can be reached from the given starting element, then the average runtime will be `O(n)` and the
 * worst-case runtime will be `O(n^2)`.
 *
 * @param start
 * @param startMode If "enter", then the first element to be entered will be the starting element. If "leave", then the
 * first element to continue after will be the starting element.
 * @param initialState
 * @param operations
 * @param direction
 */
export function followPaths<S>(
	start: Element,
	startMode: "enter" | "next",
	initialState: NonNullable<S>,
	operations: FollowOperations<NonNullable<S>>,
	direction?: MatchingDirection
): NonNullable<S> {
	function opEnter(element: Element, state: NonNullable<S>, direction: MatchingDirection): NonNullable<S> {
		state = operations.enter?.(element, state, direction) ?? state;

		const continueInto = operations.continueInto?.(element, state, direction) ?? true;
		if (continueInto) {
			switch (element.type) {
				case "Assertion": {
					if (element.kind === "lookahead" || element.kind === "lookbehind") {
						const assertionDirection = assertionKindToMatchingDirection(element.kind);
						const assertion = operations.join(
							element.alternatives.map(a =>
								enterAlternative(a, operations.fork(state, direction), assertionDirection)
							),
							assertionDirection
						);
						state = operations.endPath?.(state, assertionDirection, "assertion") ?? state;
						state = operations.assert?.(state, direction, assertion, assertionDirection) ?? state;
					}
					break;
				}
				case "Group":
				case "CapturingGroup": {
					state = operations.join(
						element.alternatives.map(a =>
							enterAlternative(a, operations.fork(state, direction), direction)
						),
						direction
					);
					break;
				}
				case "Quantifier": {
					if (element.max === 0) {
						// do nothing
					} else if (element.min === 0) {
						state = operations.join(
							[state, opEnter(element.element, operations.fork(state, direction), direction)],
							direction
						);
					} else {
						state = opEnter(element.element, state, direction);
					}
					break;
				}
			}
		}

		state = operations.leave?.(element, state, direction) ?? state;
		return state;
	}
	function enterAlternative(
		alternative: Alternative,
		state: NonNullable<S>,
		direction: MatchingDirection
	): NonNullable<S> {
		let i = direction === "ltr" ? 0 : alternative.elements.length - 1;
		const increment = direction === "ltr" ? +1 : -1;
		let element: Element | undefined;
		for (; (element = alternative.elements[i]); i += increment) {
			state = opEnter(element, state, direction);

			const continueAfter = operations.continueAfter?.(element, state, direction) ?? true;
			if (!continueAfter) {
				break;
			}
		}

		return state;
	}

	function opNext(element: Element, state: NonNullable<S>, direction: MatchingDirection): NonNullable<S> {
		type NextElement = false | Element | "pattern" | "assertion" | [Quantifier, NextElement];
		function getNextElement(element: Element): NextElement {
			const parent = element.parent;
			if (parent.type === "CharacterClass" || parent.type === "CharacterClassRange") {
				throw new Error("The given element cannot be part of a character class.");
			}

			const continuePath = operations.continueAfter?.(element, state, direction) ?? true;
			if (!continuePath) {
				return false;
			}

			if (parent.type === "Quantifier") {
				// This is difficult.
				// The main problem is that paths coming out of the quantifier might loop back into itself. This means that
				// we have to consider the path that leaves the quantifier and the path that goes back into the quantifier.
				if (parent.max <= 1) {
					// Can't loop, so we only have to consider the path going out of the quantifier.
					return getNextElement(parent);
				} else {
					return [parent, getNextElement(parent)];
				}
			} else {
				const nextIndex = parent.elements.indexOf(element) + (direction === "ltr" ? +1 : -1);
				const nextElement: Element | undefined = parent.elements[nextIndex];

				if (nextElement) {
					return nextElement;
				} else {
					const parentParent = parent.parent;
					if (parentParent.type === "Pattern") {
						return "pattern";
					} else if (parentParent.type === "Assertion") {
						return "assertion";
					} else if (parentParent.type === "CapturingGroup" || parentParent.type === "Group") {
						return getNextElement(parentParent);
					}
					throw assertNever(parentParent);
				}
			}
		}

		// eslint-disable-next-line no-constant-condition
		while (true) {
			let after = getNextElement(element);
			while (Array.isArray(after)) {
				const [quant, other] = after;
				state = operations.join(
					[state, opEnter(quant, operations.fork(state, direction), direction)],
					direction
				);
				after = other;
			}

			if (after === false) {
				return state;
			} else if (after === "assertion" || after === "pattern") {
				state = operations.endPath?.(state, direction, after) ?? state;
				return state;
			} else {
				state = opEnter(after, state, direction);
				element = after;
			}
		}
	}

	if (!direction) {
		direction = matchingDirection(start);
	}
	if (startMode === "enter") {
		initialState = opEnter(start, initialState, direction);
	}
	return opNext(start, initialState, direction);
}

export interface FirstConsumedCharAfter {
	char: FirstConsumedChar;
	elements: Element[];
}
export function getFirstConsumedCharAfter(
	afterThis: Element,
	direction: MatchingDirection,
	flags: Flags
): FirstConsumedCharAfter {
	type State = Readonly<FirstConsumedCharAfter>;
	const result = followPaths<State>(
		afterThis,
		"next",
		{ char: firstConsumedCharEmptyWord(flags), elements: [] },
		{
			fork(state): State {
				return state;
			},
			join(states): State {
				const elements = new Set<Element>();
				states.forEach(s => s.elements.forEach(e => elements.add(e)));

				return {
					char: firstConsumedCharUnion(
						states.map(s => s.char),
						flags
					),
					elements: [...elements],
				};
			},

			enter(element, state, direction): State {
				const first = getFirstCharConsumedBy(element, direction, flags);
				return {
					char: firstConsumedCharConcat([state.char, first], flags),
					elements: [...state.elements, element],
				};
			},

			continueInto(): boolean {
				return false;
			},
			continueAfter(_, state): boolean {
				return state.char.empty;
			},
		},
		direction
	);

	return { char: result.char, elements: result.elements };
}

export interface FirstCharAfter {
	/**
	 * The first character after the given element.
	 */
	char: FirstLookChar;
	/**
	 * A list of elements that all contributed to the result. All sub-elements of the listed elements also contribute.
	 */
	elements: Element[];
}
/**
 * Returns the first character after the given element.
 *
 * What "after" means depends the on the given direction which will be interpreted as the current matching
 * direction. You can use this to get the previous character of an element as well.
 */
export function getFirstCharAfter(afterThis: Element, direction: MatchingDirection, flags: Flags): FirstCharAfter {
	const result = getFirstConsumedCharAfter(afterThis, direction, flags);
	return { char: firstConsumedToLook(result.char), elements: [...result.elements] };
}

export interface SingleConsumedChar {
	char: CharSet;
	exact: boolean;
	empty: boolean;
}
/**
 * If the given element can, via some path, consume only a single character, this character will be returned. If the
 * element always consume zero or more than one character, an empty character set will be returned.
 *
 * If the element, via some path, can consume zero characters, it will be returned as `empty: true`.
 *
 * @param element
 * @param ignoreAssertions
 * @param flags
 */
export function getSingleConsumedChar(
	element: Element | Alternative | Alternative[],
	ignoreAssertions: boolean,
	flags: Flags
): SingleConsumedChar {
	if (Array.isArray(element)) {
		let empty = false;
		const union = CharUnion.emptyFromFlags(flags);
		for (const a of element) {
			const single = getSingleConsumedChar(a, ignoreAssertions, flags);
			empty = empty || single.empty;
			union.add(single.char, single.exact);
		}
		return { char: union.char, exact: union.exact, empty };
	}

	function multipleChars(): SingleConsumedChar {
		return { char: emptyCharSet(flags), exact: true, empty: false };
	}
	function zeroChars(): SingleConsumedChar {
		return { char: emptyCharSet(flags), exact: true, empty: true };
	}

	switch (element.type) {
		case "Alternative": {
			// e.g. /a?b?c?/ => /[abc]?/, /a?bc?/ => /[b]/, /abc?/ => /[]/
			let nonEmptyResult: SingleConsumedChar | undefined = undefined;
			const emptyUnion = CharUnion.emptyFromFlags(flags);
			for (const e of element.elements) {
				const single = getSingleConsumedChar(e, ignoreAssertions, flags);

				if (nonEmptyResult === undefined) {
					if (single.empty) {
						emptyUnion.add(single.char, single.exact);
					} else {
						nonEmptyResult = single;
					}
				} else {
					if (single.empty) {
						// ignore
					} else {
						return multipleChars();
					}
				}
			}

			if (nonEmptyResult) {
				return nonEmptyResult;
			} else {
				return { char: emptyUnion.char, exact: emptyUnion.exact, empty: true };
			}
		}
		case "Assertion": {
			return { char: emptyCharSet(flags), exact: false, empty: ignoreAssertions };
		}
		case "Character":
		case "CharacterClass":
		case "CharacterSet": {
			return { char: toCharSet(element, flags), exact: true, empty: false };
		}
		case "CapturingGroup":
		case "Group": {
			return getSingleConsumedChar(element.alternatives, ignoreAssertions, flags);
		}
		case "Backreference": {
			if (isEmptyBackreference(element)) {
				return zeroChars();
			}
			const resolvedSingle = getSingleConsumedChar(element.resolved, ignoreAssertions, flags);

			// the resolved character is only exact if it is only a single character.
			// i.e. /(\w)\1/ here the (\w) will capture exactly any word character, but the \1 can only match
			// one word character and that is the only (\w) matched.
			resolvedSingle.exact = resolvedSingle.exact && resolvedSingle.char.size <= 1;

			// there is at least one path through which the backreference will (possibly) be replaced with the
			// empty string
			resolvedSingle.empty = resolvedSingle.empty || !backreferenceAlwaysAfterGroup(element);

			return resolvedSingle;
		}
		case "Quantifier": {
			if (element.max === 0) {
				return zeroChars();
			}

			const single = getSingleConsumedChar(element.element, ignoreAssertions, flags);

			if (!single.empty) {
				if (element.min === 0) {
					single.empty = true;
				} else if (element.min >= 2) {
					// we will always consume at least 2 chars, so there is no *single* consumed char
					return multipleChars();
				}
			}

			return single;
		}
		default:
			throw assertNever(element);
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
