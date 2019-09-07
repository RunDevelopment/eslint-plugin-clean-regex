"use strict";

const { visitRegExpAST } = require("regexpp");
const { createRuleListener, getDocUrl } = require("../rules-util");
const util = require("../util");


/** @type {import("eslint").Rule.RuleModule} */
module.exports = {
	meta: {
		type: "suggestion",
		docs: {
			description: "Disallow unnecessary quantifiers.",
			category: "Best Practices",
			url: getDocUrl(__filename)
		},
		fixable: "code"
	},

	create(context) {
		return createRuleListener(({ pattern, removeElement, replaceElement }) => {

			visitRegExpAST(pattern, {
				onQuantifierEnter(node) {
					if (node.max === 0) {
						context.report({
							message: "The quantifier and the quantified element can be removed.",
							...removeElement(node)
						});
						return;
					}

					if (util.isZeroLength(node.element)) {
						context.report({
							message: "The quantified element does not consume characters.",
							...replaceElement(node, node.element.raw)
						});
					}

					if (node.min === 1 && node.max === 1) {
						context.report({
							message: "The quantifier is unnecessary.",
							...replaceElement(node, node.element.raw)
						});
					}

				}
			});

		});
	}
};
