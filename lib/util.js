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

const ALWAYS_ESCAPE = new Set(".*+?()[]{}^$/\\".split("").map(x => /** @type {number} */(x.codePointAt(0))));

/**
 * @typedef {import("regexpp/ast").Alternative} Alternative
 * @typedef {import("regexpp/ast").Element} Element
 * @typedef {import("regexpp/ast").Node} Node
 * @typedef {import("regexpp/ast").Pattern} Pattern
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
	 * Returns whether the given concatenation is constant meaning that it can only match one string.
	 *
	 * @param {Element[]} concatenation
	 * @returns {boolean}
	 */
	isConstant(concatenation) {
		for (const element of concatenation) {
			switch (element.type) {
				case "Character":
					// Characters are constant, so they don't cause issues
					// E.g. /A/, /\x41/
					break;

				case "Assertion":
					// Assertions are constant because the only affect whether a string matches.
					// E.g. /\bA/
					break;

				case "Quantifier":
					// Quantifiers are constant iff the minimum and maximum number of elements matched is equal and the
					// element quantified is constant.
					// E.g. /a{4}/, /(?:ab){3}/
					if (element.min !== element.max)
						return false;
					if (!util.isConstant([element.element]))
						return false;
					break;

				case "Group":
				case "CapturingGroup":
					// Groups are constant iff the groups doesn't contain alternations and the grouped concatenation
					// is constant.
					// E.g. /(?:ab)/, /(?:)/
					if (element.alternatives.length > 1)
						return false;
					if (element.alternatives.length === 1 && !util.isConstant(element.alternatives[0].elements))
						return false;
					break;

				default:
					return false;
			}
		}
		return true;
	},

	/**
	 * Returns whether the given element doesn't move the position of the automaton.
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
				return util.isZeroLength(element.resolved);

			case "CapturingGroup":
			case "Group":
				return element.alternatives.every(a => a.elements.every(e => util.isZeroLength(e)));

			default:
				throw new Error(`Unknown element type: ${element}`);
		}
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
					const other = /** @type {import("regexpp/ast").Assertion} */ (y);

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
					const other = /** @type {import("regexpp/ast").Backreference} */ (y);
					return util.areEqual(x.resolved, other.resolved);
				}

			case "CapturingGroup":
				{
					const other = /** @type {import("regexpp/ast").CapturingGroup} */ (y);

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
					const other = /** @type {import("regexpp/ast").Character} */ (y);
					return x.value === other.value;
				}

			case "CharacterClass":
				{
					const other = /** @type {import("regexpp/ast").CharacterClass} */ (y);
					return x.negate === other.negate && manyAreEqual(x.elements, other.elements);
				}

			case "CharacterClassRange":
				{
					const other = /** @type {import("regexpp/ast").CharacterClassRange} */ (y);
					return util.areEqual(x.min, other.min) && util.areEqual(x.max, other.max);
				}

			case "CharacterSet":
				{
					const other = /** @type {import("regexpp/ast").CharacterSet} */ (y);

					if (x.kind === "property" && other.kind === "property") {
						return x.negate === other.negate && x.key === other.key;
					} else {
						return x.raw === other.raw;
					}
				}

			case "Flags":
				{
					const other = /** @type {import("regexpp/ast").Flags} */ (y);
					return x.dotAll === other.dotAll && x.global === other.global && x.ignoreCase === other.ignoreCase
						&& x.multiline === other.multiline && x.sticky === other.sticky && x.unicode === other.unicode;
				}

			case "Group":
			case "Pattern":
				{
					const other = /** @type {import("regexpp/ast").Group} */ (y);
					return alternativesAreEqual(x, other);
				}

			case "Quantifier":
				{
					const other = /** @type {import("regexpp/ast").Quantifier} */ (y);
					return x.min === other.min && x.max === other.max && x.greedy === other.greedy &&
						util.areEqual(x.element, other.element);
				}

			case "RegExpLiteral":
				{
					const other = /** @type {import("regexpp/ast").RegExpLiteral} */ (y);
					return util.areEqual(x.flags, other.flags) && util.areEqual(x.pattern, other.pattern);
				}

			default:
				throw new Error(`Unknown element: ${x}`);
		}
	},

	/**
	 *
	 * @param {Pattern} pattern
	 * @param {import("regexpp/ast").CapturingGroup} group
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

};

module.exports = util;
