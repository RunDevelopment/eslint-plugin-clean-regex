"use strict";

const { createRuleListener, getDocUrl } = require("../rules-util");
const util = require("../util");


/** @type {import("eslint").Rule.RuleModule} */
module.exports = {
	meta: {
		type: "suggestion",
		docs: {
			description: "Disallow unnecessarily lazy quantifiers.",
			category: "Best Practices",
			url: getDocUrl(__filename)
		},
		fixable: "code"
	},

	create(context) {

		return createRuleListener(({ visitAST, replaceQuantifier }) => {

			visitAST({
				onQuantifierEnter(node) {
					if (!node.greedy && node.min === node.max) {
						let raw = util.getQuantifierRaw(node);
						raw = raw.substr(0, raw.length - 1); // remove "?"

						context.report({
							message: "The lazy modifier is unnecessary for constant quantifiers.",
							...replaceQuantifier(node, raw)
						});
					}
				}
			});

		});
	}
};
