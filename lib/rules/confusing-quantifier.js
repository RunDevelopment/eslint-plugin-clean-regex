"use strict";

const { createRuleListener, getDocUrl } = require("../rules-util");
const { isPotentiallyZeroLength } = require("../util");


/** @type {import("eslint").Rule.RuleModule} */
module.exports = {
	meta: {
		type: "problem",
		docs: {
			description: "Warn about confusing quantifiers.",
			category: "Possible Errors",
			url: getDocUrl(__filename)
		}
	},

	create(context) {
		return createRuleListener(({ visitAST, reportQuantifier }) => {

			visitAST({
				onQuantifierEnter(node) {
					if (!node.greedy) {
						return; // this rule doesn't work with lazy quantifiers
					}
					if (node.max === 0) {
						// see no-unnecessary-quantifier
						return;
					}
					if (node.min === 0 && node.max > 1) {
						return; // nothing to do here
					}

					if (isPotentiallyZeroLength(node.element)) {
						if (node.min === 0 && node.max === 1) {
							context.report({
								message: "This optional quantifier might be unnecessary because the quantified element can be empty.",
								...reportQuantifier(node)
							});
							return;
						} else /* if (node.min > 0) */ {
							context.report({
								message: "Even though the minimum of the quantifier is not 0, the quantified expression can potentially be empty which makes the minimum effectively 0.\nEither make the minimum 0 or refactor the quantified expression to not be potentially empty.",
								...reportQuantifier(node)
							});
						}
					}
				}
			});

		});
	}
};
