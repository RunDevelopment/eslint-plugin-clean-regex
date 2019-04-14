/**
 * @fileoverview Rule to sort the flags of regular expressions
 * @author Michael Schmidt
 */
"use strict";

const { createRuleListener, reportFlags } = require("../rules-util");


/** @type {import("eslint").Rule.RuleModule} */
module.exports = {
	meta: {
		type: "suggestion",

		docs: {
			description: "disallow lookarounds which match the empty word",
			category: "Stylistic Issues",
			recommended: false,
			url: "https://eslint.org/docs/rules/no-extra-semi"
		},
		fixable: "code",
		schema: [
			{
				type: "object",
				properties: {
					"order": {
						type: "string",
						format: /^[gimsuy]{6}$/
					}
				},
				additionalProperties: false
			}
		]
	},

	create(context) {

		/** @type {string} */
		const order = (context.options[0] || {}).order || "gimsuy";

		/**
		 * A compare function for regex flags.
		 *
		 * @param {string} a
		 * @param {string} b
		 */
		const compareFn = (a, b) => {
			const aIndex = order.indexOf(a);
			const bIndex = order.indexOf(b);

			if (aIndex === -1) throw new Error(`Unknown flag ${a}.`);
			if (bIndex === -1) throw new Error(`Unknown flag ${b}.`);

			return aIndex - bIndex;
		};

		return createRuleListener({
			RegexLiteral(node) {
				const { flags } = node.regex;

				const sortedFlags = flags.split("").sort(compareFn).join("");

				if (flags !== sortedFlags) {
					context.report({
						message: `Unsorted flags: The flags should in the order ${sortedFlags}.`,
						...reportFlags(node, sortedFlags)
					});
				}
			}
		});
	}
};
