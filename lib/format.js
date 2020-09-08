"use strict";

const { JS } = require("refa");

/**
 * @typedef {{ source: string; flags: string; }} Literal
 * @typedef {import("refa").FiniteAutomaton} FiniteAutomaton
 * @typedef {import("regexpp/ast").Node} Node
 */

const format = {

	/**
	 * @param {string} string
	 * @param {number} maxLength
	 * @returns {string}
	 */
	shorten(string, maxLength) {
		if (string.length <= maxLength) {
			return string;
		} else {
			return string.substr(0, maxLength - 1) + "…";
		}
	},

	/**
	 * Converts the given value to the string of a `RegExp` literal.
	 *
	 * @param {Literal | FiniteAutomaton} value
	 * @returns {string}
	 * @example
	 * toRegExpString(/foo/i) // returns "/foo/i"
	 */
	toRegExpString(value) {
		if ("toRegex" in value) {
			const re = value.toRegex();
			const literal = JS.toLiteral(re);
			return format.toRegExpString(literal);
		} else {
			return `/${value.source}/${value.flags}`;
		}
	},

	/**
	 * Returns a string that mentions the given node or string representation of a node.
	 *
	 * @param {Node | string} node
	 * @returns {string}
	 */
	mention(node) {
		return "`" + (typeof node === "string" ? node : node.raw) + "`";
	},

};

module.exports = format;
