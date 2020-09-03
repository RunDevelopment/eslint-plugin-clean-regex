"use strict";

const { createRuleListener, getDocUrl } = require("../rules-util");
const { isPotentiallyEmpty, quantifierToString } = require("../util");


/** @type {import("eslint").Rule.RuleModule} */
module.exports = {
	meta: {
		type: "problem",
		docs: {
			description: "Warn about confusing quantifiers.",
			url: getDocUrl(__filename)
		}
	},

	create(context) {
		return createRuleListener(({ visitAST, reportQuantifier }) => {

			visitAST({
				onQuantifierEnter(node) {
					if (node.min > 0 && isPotentiallyEmpty(node.element)) {
						const proposal = quantifierToString({ ...node, min: 0 });
						context.report({
							message: `This quantifier is confusing because its minimum is ${node.min} but it can match the empty string. Maybe replace it with ${proposal} to reflect that it can match the empty string?`,
							...reportQuantifier(node)
						});
						return;
					}
				}
			});

		});
	}
};
