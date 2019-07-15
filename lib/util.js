"use strict";

const CP_0 = /** @type {number} */ ("0".codePointAt(0));
const CP_9 = /** @type {number} */ ("9".codePointAt(0));
const CP_A = /** @type {number} */ ("A".codePointAt(0));
const CP_Z = /** @type {number} */ ("Z".codePointAt(0));
const CP_a = /** @type {number} */ ("a".codePointAt(0));
const CP_z = /** @type {number} */ ("z".codePointAt(0));
const CP_F = /** @type {number} */ ("F".codePointAt(0));
const CP_f = /** @type {number} */ ("f".codePointAt(0));

const ALWAYS_ESCAPE = new Set(".*+?()[]{}^$/\\".split("").map(x => /** @type {number} */ (x.codePointAt(0))));

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
	 * @param {import("regexpp/ast").Element[]} concatenation
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
	 *
	 *
	 * @param {number} codePoint
	 * @param {import("regexpp/ast").Element[]} previous
	 * @returns {string}
	 */
	minimalEscapeSequence(codePoint, previous) {
		// some characters always have to be escaped
		if (ALWAYS_ESCAPE.has(codePoint)) {
			return "\\" + String.fromCodePoint(codePoint);
		}

		// we're the first in the concatenation, so no can't be part of an escape sequence or similar.
		if (previous.length === 0) {
			return String.fromCodePoint(codePoint);
		}

		/**
		 * Returns whether the concatenation sibling of this groups (including quantifier) matches
		 * the given pattern.
		 *
		 * @param {number} relativeIndex The index of the sibling relating to this group.
		 * E.g. -1 is the previous element.
		 * @param {string | RegExp} pattern
		 * @param {"Character" | "Quantifier" | "Group" | "CapturingGroup" | "CharacterClass" | "Assertion" | "CharacterSet" | "Backreference"} [type="Character"]
		 */
		function matchSibling(relativeIndex, pattern, type = "Character") {
			if (elements[nodeIndex + relativeIndex]) {
				if (type && elements[nodeIndex + relativeIndex].type !== type) {
					return false;
				}

				if (typeof pattern === "string") {
					return elements[nodeIndex + relativeIndex].raw === pattern;
				} else {
					return pattern.test(elements[nodeIndex + relativeIndex].raw);
				}
			}
			return false;
		}


		const isDigit = util.isDigit(codePoint);
		const isHex = util.isHexDigit(codePoint);
		const isLetter = util.isLetter(codePoint);

		if (nodeIndex > 0) {
			// \1(?:2) or \0(?:2)
			if (isDigit && matchSibling(-1, /^\\\d+$/, null)) {
				return;
			}

			const unescapedHex = /^[\da-f]$/i;

			// \x4(?:1) or \x(?:4)1
			if (isHex && (
				matchSibling(-1, "\\x") ||
				matchSibling(-2, "\\x") && matchSibling(-1, unescapedHex)
			)) {
				return;
			}

			// \u004(?:1) or \u00(?:4)1 or \u0(?:0)41 or \u(?:0)041
			if (isHex && (
				matchSibling(-1, "\\u") ||
				matchSibling(-1, unescapedHex) && (matchSibling(-2, "\\u") ||
					matchSibling(-2, unescapedHex) && (matchSibling(-3, "\\u") ||
						matchSibling(-3, unescapedHex) && matchSibling(-4, "\\u")
					)
				)
			)) {
				return;
			}

			// \c(?:A)
			if (isLetter && matchSibling(-1, "\c")) {
				return;
			}

			// a{(?:2)} or b{2,(?:10)} or b{(?:2})
			if (isDigit || char.raw === "," || char.raw === "}") {
				let digitOrComma = 0;
				while (digitOrComma < nodeIndex && matchSibling(-digitOrComma - 1, /^[\d,]$/)) {
					digitOrComma++;
				}
				if (matchSibling(-digitOrComma - 1, "{")) {
					return;
				}
			}

			// \u{(?:41)} or \u{F(?:F)} or \u{FF(?:})
			if (isHex || char.raw === "}") {
				let hexDigits = 0;
				while (hexDigits < nodeIndex && matchSibling(-hexDigits - 1, unescapedHex)) {
					hexDigits++;
				}
				if (matchSibling(-hexDigits - 1, "{") && matchSibling(-hexDigits - 2, "\\u")) {
					return;
				}
			}

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
