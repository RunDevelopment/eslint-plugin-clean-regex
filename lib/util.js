"use strict";

const { visitRegExpAST } = require("regexpp");


const CP_0 = /** @type {number} */ ("0".codePointAt(0));
const CP_9 = /** @type {number} */ ("9".codePointAt(0));
const CP_A = /** @type {number} */ ("A".codePointAt(0));
const CP_Z = /** @type {number} */ ("Z".codePointAt(0));
const CP_a = /** @type {number} */ ("a".codePointAt(0));
const CP_z = /** @type {number} */ ("z".codePointAt(0));
const CP_F = /** @type {number} */ ("F".codePointAt(0));
const CP_f = /** @type {number} */ ("f".codePointAt(0));

/**
 * @typedef {import("regexpp/ast").Alternative} Alternative
 * @typedef {import("regexpp/ast").Assertion} Assertion
 * @typedef {import("regexpp/ast").Backreference} Backreference
 * @typedef {import("regexpp/ast").CapturingGroup} CapturingGroup
 * @typedef {import("regexpp/ast").Character} Character
 * @typedef {import("regexpp/ast").CharacterClass} CharacterClass
 * @typedef {import("regexpp/ast").CharacterSet} CharacterSet
 * @typedef {import("regexpp/ast").Group} Group
 * @typedef {import("regexpp/ast").Quantifier} Quantifier
 * @typedef {import("regexpp/ast").Element} Element
 * @typedef {import("regexpp/ast").Node} Node
 * @typedef {import("regexpp/ast").Pattern} Pattern
 * @typedef {import("regexpp/ast").Flags} Flags
 */

const util = {

	/**
	 * Returns whether the character with the given code point is a decimal digit.
	 *
	 * @param {number} codePoint
	 * @returns {boolean}
	 */
	isDigit(codePoint) {
		return codePoint >= CP_0 && codePoint <= CP_9;
	},

	/**
	 * Returns whether the character with the given code point is a hexadecimal digit.
	 *
	 * @param {number} codePoint
	 * @returns {boolean}
	 */
	isHexDigit(codePoint) {
		return codePoint >= CP_0 && codePoint <= CP_9 ||
			codePoint >= CP_A && codePoint <= CP_F || codePoint >= CP_a && codePoint <= CP_f;
	},

	/**
	 * Returns whether the character with the given code point is a letter.
	 *
	 * @param {number} codePoint
	 * @returns {boolean}
	 */
	isLetter(codePoint) {
		return codePoint >= CP_A && codePoint <= CP_Z || codePoint >= CP_a && codePoint <= CP_z;
	},

	/**
	 * Returns whether the given node is constant meaning that it can only match one string and what this string is.
	 * If the node is constant, it will return the constant string.
	 *
	 * @param {Node} node
	 * @param {Flags} flags
	 * @returns {false | { word: string }}
	 */
	getConstant(node, flags) {
		switch (node.type) {
			case "Alternative":
				{
					let word = "";
					for (const element of node.elements) {
						const elementResult = util.getConstant(element, flags);
						if (elementResult === false) {
							return false;
						} else {
							word += elementResult.word;
						}
					}
					return { word };
				}
			case "Assertion":
			case "Flags":
				{
					// Assertions are constant because the only affect whether a string matches.
					// Flags are trivially constant
					return { word: "" };
				}
			case "Backreference":
				{
					if (util.isRecursiveReference(node)) {
						return { word: "" };
					} else {
						// only constant if the expression of the capturing group is constant
						return util.getConstant(node.resolved, flags);
					}
				}
			case "CapturingGroup":
			case "Group":
			case "Pattern":
				{
					if (node.alternatives.length == 0) {
						return { word: "" };
					} else if (node.alternatives.length == 1) {
						return util.getConstant(node.alternatives[0], flags);
					} else {
						/** @type {string | false} */
						let word = false;
						for (const alt of node.alternatives) {
							const altResult = util.getConstant(alt, flags);
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
			case "Character":
				{
					const string = String.fromCodePoint(node.value);
					if (flags.ignoreCase && string.toLowerCase() !== string.toUpperCase()) {
						return false;
					}
					return { word: string };
				}
			case "CharacterClass":
				{
					// Here's a question is the empty character class (`[]` or `[^\s\S]`) constant?
					// I say, no it isn't.
					if (node.negate) {
						// negated character classes are 1) really hard to check and 2) very unlikely to be constant
						return false;
					}

					/** @type {false | string} */
					let word = false;
					for (const element of node.elements) {
						const elementResult = util.getConstant(element, flags);
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
			case "CharacterClassRange":
				{
					return node.min.value == node.max.value && util.getConstant(node.min, flags);
				}
			case "CharacterSet":
				{
					// for themselves, character sets like \w, ., \s are not constant
					return false;
				}
			case "Quantifier":
				{
					if (node.max === 0) {
						return { word: "" };
					}
					const elementResult = util.getConstant(node.element, flags);
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
			case "RegExpLiteral":
				{
					return util.getConstant(node.pattern, flags);
				}
			default:
				return false;
		}
	},

	/**
	 * Returns whether all paths of the given element don't move the position of the automaton.
	 *
	 * @param {Element} element
	 * @returns {boolean}
	 */
	isZeroLength(element) {
		switch (element.type) {
			case "Assertion":
				return true;

			case "Character":
			case "CharacterClass":
			case "CharacterSet":
				return false;

			case "Quantifier":
				return element.max === 0 || util.isZeroLength(element.element);

			case "Backreference":
				if (element.start < element.resolved.start) {
					// early references will always be replaced with an empty string
					return true;
				}
				return util.isZeroLength(element.resolved);

			case "CapturingGroup":
			case "Group":
				return element.alternatives.every(a => a.elements.every(e => util.isZeroLength(e)));

			default:
				throw util.assertNever(element);
		}
	},

	/**
	 * Returns whether at least one path of the given element does not move the position of the automation.
	 *
	 * @param {Element} element
	 * @returns {boolean}
	 */
	isPotentiallyZeroLength(element) {
		switch (element.type) {
			case "Assertion":
				return true;

			case "Backreference":
				if (element.start < element.resolved.start) {
					// early references will always be replaced with an empty string
					return true;
				}
				return util.isPotentiallyZeroLength(element.resolved);

			case "Character":
			case "CharacterClass":
			case "CharacterSet":
				return false;

			case "CapturingGroup":
			case "Group":
				return element.alternatives.some(a => a.elements.every(e => util.isPotentiallyZeroLength(e)));

			case "Quantifier":
				return element.min === 0 || util.isPotentiallyZeroLength(element.element);

			default:
				throw util.assertNever(element);
		}
	},

	/**
	 * Returns whether all paths of the given element does not move the position of the automation and accept
	 * regardless of prefix and suffix.
	 *
	 * @param {Element | Alternative} element
	 * @returns {boolean}
	 */
	isEmpty(element) {
		switch (element.type) {
			case "Alternative":
				return element.elements.every(util.isEmpty);

			case "Assertion":
				// assertion do not consume characters but they do usually reject some pre- or suffixes
				if (element.kind === "lookahead" || element.kind === "lookbehind") {
					if (!element.negate && element.alternatives.some(util.isPotentiallyEmpty)) {
						// if a positive lookaround is potentially empty, it will trivially accept all pre- or suffixes
						return true;
					}
				}
				return false;

			case "Backreference":
				if (element.start < element.resolved.start) {
					// early references will always be replaced with an empty string
					return true;
				}
				return util.isEmpty(element.resolved);

			case "Character":
			case "CharacterClass":
			case "CharacterSet":
				return false;

			case "CapturingGroup":
			case "Group":
				return element.alternatives.every(util.isEmpty);

			case "Quantifier":
				return element.max === 0 || util.isEmpty(element.element);

			default:
				throw util.assertNever(element);
		}
	},

	/**
	 * Returns whether at least one path of the given element does not move the position of the automation and accepts
	 * regardless of prefix and suffix.
	 *
	 * This basically means that it can match the empty string and that it does that at any position in any string.
	 * Lookarounds do not affect this as (as mentioned above) all prefixes and suffixes are accepted.
	 *
	 * @param {Element | Alternative} element
	 * @returns {boolean}
	 */
	isPotentiallyEmpty(element) {
		switch (element.type) {
			case "Alternative":
				return element.elements.every(util.isPotentiallyEmpty);

			case "Assertion":
				// assertion do not consume characters but they do usually reject some pre- or suffixes
				if (element.kind === "lookahead" || element.kind === "lookbehind") {
					if (!element.negate && element.alternatives.some(util.isPotentiallyEmpty)) {
						// if a positive lookaround is potentially empty, it will trivially accept all pre- or suffixes
						return true;
					}
				}
				return false;

			case "Backreference":
				if (element.start < element.resolved.start) {
					// early references will always be replaced with an empty string
					return true;
				}
				return util.isPotentiallyEmpty(element.resolved);

			case "Character":
			case "CharacterClass":
			case "CharacterSet":
				return false;

			case "CapturingGroup":
			case "Group":
				return element.alternatives.some(util.isPotentiallyEmpty);

			case "Quantifier":
				return element.min === 0 || util.isPotentiallyEmpty(element.element);

			default:
				throw util.assertNever(element);
		}
	},

	/**
	 * Returns whether the given backreference is contained by the group it references.
	 *
	 * @param {Backreference} backRef
	 * @returns {boolean}
	 */
	isRecursiveReference(backRef) {
		const capturingGroup = backRef.resolved;
		return util.hasSomeAncestor(backRef, ancestor => ancestor === capturingGroup);
	},

	/**
	 * Returns whether any of the ancestors of the given node fulfill the given condition.
	 *
	 * The ancestors will be iterated in the order from closest to farthest.
	 * The condition function will not be called on the given node.
	 *
	 * @param {Node} node
	 * @param {(ancestor: import("regexpp/ast").BranchNode) => boolean} conditionFn
	 */
	hasSomeAncestor(node, conditionFn) {
		/** @type {Node["parent"]} */
		let parent = node.parent;
		while (parent) {
			if (conditionFn(parent)) {
				return true;
			}
			parent = parent.parent;
		}
		return false;
	},

	/**
	 * Returns whether any of the descendants of the given node fulfill the given condition.
	 *
	 * The descendants will be iterated in a DFS top-to-bottom manner from left to right with the first node being the
	 * given node.
	 *
	 * This function is short-circuited, so as soon as any `conditionFn` returns `true`, `true` will be returned.
	 *
	 * @param {Node & T} node
	 * @param {(descendant: import("./util-types").Descendants<T>) => boolean} conditionFn
	 * @param {(descendant: import("./util-types").Descendants<T>) => boolean} [descentConditionFn] An optional
	 * function to decide whether the descendant of the given node will be checked as well.
	 * @returns {boolean}
	 * @template T
	 */
	hasSomeDescendant(node, conditionFn, descentConditionFn) {
		if (conditionFn(node)) {
			return true;
		}

		if (descentConditionFn && !descentConditionFn(node)) {
			return false;
		}

		switch (node.type) {
			case "Alternative":
				return node.elements.some(e => util.hasSomeDescendant(e, conditionFn, descentConditionFn));
			case "Assertion":
				if (node.kind === "lookahead" || node.kind === "lookbehind") {
					return node.alternatives.some(a => util.hasSomeDescendant(a, conditionFn, descentConditionFn));
				}
				return false;
			case "CapturingGroup":
			case "Group":
			case "Pattern":
				return node.alternatives.some(a => util.hasSomeDescendant(a, conditionFn, descentConditionFn));
			case "CharacterClass":
				return node.elements.some(e => util.hasSomeDescendant(e, conditionFn, descentConditionFn));
			case "CharacterClassRange":
				return util.hasSomeDescendant(node.min, conditionFn, descentConditionFn) ||
					util.hasSomeDescendant(node.max, conditionFn, descentConditionFn);
			case "Quantifier":
				return util.hasSomeDescendant(node.element, conditionFn, descentConditionFn);
			case "RegExpLiteral":
				return util.hasSomeDescendant(node.pattern, conditionFn, descentConditionFn) ||
					util.hasSomeDescendant(node.flags, conditionFn, descentConditionFn);
		}
		return false;
	},

	/**
	 * Returns whether two nodes are semantically equivalent.
	 *
	 * @param {Node | null} x
	 * @param {Node | null} y
	 * @returns {boolean}
	 */
	areEqual(x, y) {
		if (x == y) {
			return true;
		}
		if (!x || !y || x.type != y.type) {
			return false;
		}

		/**
		 *
		 * @param {Node[]} a
		 * @param {Node[]} b
		 * @returns {boolean}
		 */
		function manyAreEqual(a, b) {
			if (a.length !== b.length) {
				return false;
			}
			for (let i = 0; i < a.length; i++) {
				if (!util.areEqual(a[i], b[i])) {
					return false;
				}
			}
			return true;
		}

		/**
		 *
		 * @param {{ alternatives: Alternative[] }} a
		 * @param {{ alternatives: Alternative[] }} b
		 * @returns {boolean}
		 */
		function alternativesAreEqual(a, b) {
			return manyAreEqual(a.alternatives, b.alternatives);
		}

		switch (x.type) {
			case "Alternative":
				{
					const other = /** @type {Alternative} */ (y);
					return manyAreEqual(x.elements, other.elements);
				}

			case "Assertion":
				{
					const other = /** @type {Assertion} */ (y);

					if (x.kind === other.kind) {
						if (x.kind === "lookahead" || x.kind === "lookbehind") {
							const otherLookaround = /** @type {import("regexpp/ast").LookaroundAssertion} */ (y);
							return x.negate === otherLookaround.negate && alternativesAreEqual(x, otherLookaround);
						} else {
							return x.raw === other.raw;
						}
					}
					return false;
				}

			case "Backreference":
				{
					const other = /** @type {Backreference} */ (y);
					return util.areEqual(x.resolved, other.resolved);
				}

			case "CapturingGroup":
				{
					const other = /** @type {CapturingGroup} */ (y);

					const p1 = util.getPattern(x);
					const p2 = util.getPattern(other);
					if (p1 && p2) {
						const n1 = util.getCapturingGroupNumber(p1, x);
						const n2 = util.getCapturingGroupNumber(p2, other);
						if (n1 && n2) {
							return n1 === n2 && alternativesAreEqual(x, other);
						}
					}
					return false;
				}

			case "Character":
				{
					const other = /** @type {Character} */ (y);
					return x.value === other.value;
				}

			case "CharacterClass":
				{
					const other = /** @type {CharacterClass} */ (y);
					return x.negate === other.negate && manyAreEqual(x.elements, other.elements);
				}

			case "CharacterClassRange":
				{
					const other = /** @type {import("regexpp/ast").CharacterClassRange} */ (y);
					return util.areEqual(x.min, other.min) && util.areEqual(x.max, other.max);
				}

			case "CharacterSet":
				{
					const other = /** @type {CharacterSet} */ (y);

					if (x.kind === "property" && other.kind === "property") {
						return x.negate === other.negate && x.key === other.key;
					} else {
						return x.raw === other.raw;
					}
				}

			case "Flags":
				{
					const other = /** @type {Flags} */ (y);
					return x.dotAll === other.dotAll && x.global === other.global && x.ignoreCase === other.ignoreCase
						&& x.multiline === other.multiline && x.sticky === other.sticky && x.unicode === other.unicode;
				}

			case "Group":
			case "Pattern":
				{
					const other = /** @type {Group} */ (y);
					return alternativesAreEqual(x, other);
				}

			case "Quantifier":
				{
					const other = /** @type {Quantifier} */ (y);
					return x.min === other.min && x.max === other.max && x.greedy === other.greedy &&
						util.areEqual(x.element, other.element);
				}

			case "RegExpLiteral":
				{
					const other = /** @type {import("regexpp/ast").RegExpLiteral} */ (y);
					return util.areEqual(x.flags, other.flags) && util.areEqual(x.pattern, other.pattern);
				}

			default:
				throw util.assertNever(x);
		}
	},

	/**
	 *
	 * @param {Pattern} pattern
	 * @param {CapturingGroup} group
	 * @returns {number | null}
	 */
	getCapturingGroupNumber(pattern, group) {
		let found = 0;
		try {
			visitRegExpAST(pattern, {
				onCapturingGroupEnter(node) {
					found++;
					if (node === group) {
						// throw an error to end early
						throw new Error();
					}
				}
			});
			return null;
		} catch (error) {
			return found;
		}
	},

	/**
	 *
	 * @param {Node} node
	 * @returns {Pattern | null}
	 */
	getPattern(node) {
		switch (node.type) {
			case "Pattern":
				return node;
			case "RegExpLiteral":
				return node.pattern;
			case "Flags":
				return node.parent ? node.parent.pattern : null;
			default:
				return util.getPattern(node.parent);
		}
	},

	/**
	 * Returns the minimal hexadecimal escape sequence of a given code point.
	 *
	 * This will use one of the following formats: `\xFF`, `\uFFFF`, or `\u{10FFFF}`.
	 *
	 * @param {number} codePoint
	 */
	minimalHexEscape(codePoint) {
		if (codePoint <= 0xFF) {
			return "\\x" + codePoint.toString(16).padStart(2, "0");
		} else if (codePoint <= 0xFFFF) {
			return "\\u" + codePoint.toString(16).padStart(4, "0");
		} else {
			return "\\u{" + codePoint.toString(16) + "}";
		}
	},

	/**
	 * Returns the rule name of the rule behind the given filename of a rule.
	 *
	 * @param {string} filename The filename of path of a rule.
	 * @returns {string}
	 */
	filenameToRule(filename) {
		const rule = (/([-\w]+)\.js$/.exec(filename) || [undefined, undefined])[1];
		if (!rule) {
			throw new Error(`Invalid rule filename: ${filename}`);
		}
		return rule;
	},

	/**
	 * Returns whether the given character is written as an octal escape.
	 *
	 * This will return `false` for `\0`.
	 *
	 * @param {Character} node
	 * @returns {boolean}
	 */
	isOctalEscape(node) {
		return node.value > 0 && /^\\[0-7]+$/.test(node.raw);
	},

	/**
	 *
	 * @param {Node} root
	 * @param {number} index
	 * @returns {Node | undefined}
	 */
	nodeAt(root, index) {
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
					const result = util.nodeAt(alt, index);
					if (result) {
						return result;
					}
				}
				break;

			case "Quantifier":
				{
					let res = util.nodeAt(root.element, index);
					if (res) return res;
					break;
				}

			case "RegExpLiteral":
				{
					let res = util.nodeAt(root.flags, index);
					if (res) return res;
					res = util.nodeAt(root.pattern, index);
					if (res) return res;
					break;
				}

			default:
				break;
		}

		return root;
	},

	repoTreeRoot: "https://github.com/RunDevelopment/eslint-plugin-clean-regex/blob/master",

	/**
	 * Throws an error when invoked.
	 *
	 * @param {never} value
	 * @returns {never}
	 */
	assertNever(value) {
		throw new Error(`This part of the code should never be reached but ${value} made it through.`);
	},

	/**
	 * Returns the string representation of the given quantifier.
	 *
	 * @param {{ min: number; max: number; greedy?: boolean }} quant
	 * @returns {string}
	 */
	quantifierToString(quant) {
		if (quant.max < quant.min
			|| quant.min < 0
			|| !Number.isInteger(quant.min)
			|| !(Number.isInteger(quant.max) || quant.max === Infinity)) {
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

		if (quant.greedy) {
			return value + "?";
		} else {
			return value;
		}
	}

};

module.exports = util;
