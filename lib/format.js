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
	 * @param {"start" | "end" | "center"} [position="end"]
	 * @returns {string}
	 */
	shorten(string, maxLength, position) {
		if (string.length <= maxLength) {
			return string;
		} else {
			maxLength--;
			if (position === "end" || position == undefined) {
				return string.substr(0, maxLength) + "…";
			} else if (position === "start") {
				return "…" + string.substr(string.length - maxLength, maxLength);
			} else if (position === "center") {
				const start = maxLength >>> 1;
				const end = start + (maxLength % 2);
				return string.substr(0, start) + "…" + string.substr(string.length - end, end);
			} else {
				throw new Error("Invalid position.");
			}
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

	/**
	 *
	 * @param {number} count
	 * @param {string} unit
	 * @param {string} [unitPlural]
	 */
	many(count, unit, unitPlural) {
		if (!unitPlural) {
			if (unit.length > 1 && unit[unit.length - 1] === "y") {
				unitPlural = unit.substr(0, unit.length - 1) + "ies";
			} else {
				unitPlural = unit + "s";
			}
		}

		if (count === 1) {
			return "1 " + unit;
		} else {
			return count + " " + unitPlural;
		}
	},
};

module.exports = format;
