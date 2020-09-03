"use strict";

const { createRuleListener, getDocUrl } = require("../rules-util");
const util = require("../util");


/** @type {{ min: number; max: number; raw: string }[]} */
const predefined = [
	{ min: 0, max: Infinity, raw: "*" },
	{ min: 1, max: Infinity, raw: "+" },
	{ min: 0, max: 1, raw: "?" },
];


/** @type {import("eslint").Rule.RuleModule} */
module.exports = {
	meta: {
		type: "suggestion",
		docs: {
			description: "Prefer predefined quantifiers (+*?) instead of their more verbose form.",
			url: getDocUrl(__filename)
		},
		fixable: "code"
	},

	create(context) {
		return createRuleListener(({ visitAST, replaceQuantifier }) => {

			visitAST({
				onQuantifierEnter(node) {
					let currentRaw = util.getQuantifierRaw(node);
					if (!node.greedy) {
						currentRaw = currentRaw.substr(0, currentRaw.length - 1);
					}

					for (const { min, max, raw } of predefined) {
						if (node.min === min && node.max === max && currentRaw !== raw) {
							context.report({
								message: `Use the predefined quantifier ${raw} instead.`,
								...replaceQuantifier(node, raw + (node.greedy ? "" : "?"))
							});
						}
					}
				}
			});

		});
	}
};
