"use strict";

const { createRuleListener, getDocUrl } = require("../rules-util");
const { hasSomeDescendant } = require("../util");


/** @type {import("eslint").Rule.RuleModule} */
module.exports = {
	meta: {
		type: "problem",
		docs: {
			description: "Disallow quantifiers with a maximum of 0.",
			url: getDocUrl(__filename)
		},
		fixable: "code"
	},

	create(context) {
		return createRuleListener(({ visitAST, removeElement, reportElement }) => {

			visitAST({
				onQuantifierEnter(node) {
					if (node.max === 0) {
						let props;
						if (hasSomeDescendant(node, n => n.type === "CapturingGroup")) {
							// we can't just remove a capturing group, so we'll just report
							props = reportElement(node);
						} else {
							props = removeElement(node);
						}

						context.report({
							message: "The quantifier and the quantified element can be removed.",
							...props
						});
					}
				}
			});

		});
	}
};
