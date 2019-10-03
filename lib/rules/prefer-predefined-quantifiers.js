"use strict";

const { visitRegExpAST } = require("regexpp");
const { createRuleListener, getDocUrl } = require("../rules-util");


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
			category: "Best Practices",
			url: getDocUrl(__filename)
		},
		fixable: "code"
	},

	create(context) {
		return createRuleListener(({ pattern, replaceQuantifier }) => {

			visitRegExpAST(pattern, {
				onQuantifierEnter(node) {
					let nodeRaw = node.raw.substr(node.element.end - node.start);
					if (!node.greedy) {
						nodeRaw = nodeRaw.substr(0, nodeRaw.length - 1);
					}

					for (const { min, max, raw } of predefined) {
						if (node.min === min && node.max === max && nodeRaw !== raw) {
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
