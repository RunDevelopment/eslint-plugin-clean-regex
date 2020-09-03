"use strict";

const { createRuleListener, getDocUrl } = require("../rules-util");
const util = require("../util");


/**
 * @typedef {import("refa").CharRange} CharRange
 */

/** @type {readonly CharRange[]} */
const allowedRanges = [
	// digits 0-9
	{ min: "0".charCodeAt(0), max: "9".charCodeAt(0) },
	// Latin A-Z
	{ min: "A".charCodeAt(0), max: "Z".charCodeAt(0) },
	// Latin a-z
	{ min: "a".charCodeAt(0), max: "z".charCodeAt(0) }
];

/**
 * @param {number} char
 * @param {CharRange} range
 * @returns {boolean}
 */
function inRange(char, range) {
	return range.min <= char && char <= range.max;
}


/** @type {import("eslint").Rule.RuleModule} */
module.exports = {
	meta: {
		type: "problem",
		docs: {
			description: "Disallow obscure ranges in character classes.",
			url: getDocUrl(__filename)
		}
	},

	create(context) {
		return createRuleListener(({ visitAST, reportElement }) => {

			visitAST({
				onCharacterClassRangeEnter(node) {
					const { min, max } = node;

					if (min.value == max.value) {
						// we don't deal with that
						return;
					}

					if (util.isControlEscapeSequence(min) && util.isControlEscapeSequence(max)) {
						// both min and max are control escapes
						return;
					}
					if (util.isOctalEscapeSequence(min) && util.isOctalEscapeSequence(max)) {
						// both min and max are either octal
						return;
					}
					if ((util.isHexadecimalEscapeSequence(min) || min.value === 0) && util.isHexadecimalEscapeSequence(max)) {
						// both min and max are hexadecimal (with a small exception for \0)
						return;
					}

					if (allowedRanges.some(r => inRange(min.value, r) && inRange(max.value, r))) {
						return;
					}

					context.report({
						message: `It's not obvious what characters are matched by ${node.raw}`,
						...reportElement(node)
					});
				}
			});

		});
	}
};
