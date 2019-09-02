"use strict";

const { visitRegExpAST } = require("regexpp");
const { isConstant, isZeroLength } = require("../util");
const { createRuleListener } = require("../rules-util");


/** @type {import("eslint").Rule.RuleModule} */
module.exports = {
	meta: {
		type: "problem",

		docs: {
			description: "disallow capturing groups which can match one word",
			category: "Possible Errors",
			recommended: true,
			url: "https://eslint.org/docs/rules/no-extra-semi"
		},
		fixable: "code",
		schema: []
	},

	create(context) {
		return createRuleListener(({ pattern, reportElement }) => {

			visitRegExpAST(pattern, {
				onCapturingGroupEnter(node) {
					if (node.alternatives.length === 1) {
						const concatenation = node.alternatives[0].elements;

						if (concatenation.length === 0) {
							context.report({
								message: "Empty capturing group",
								...reportElement(node)
							});
							return;
						}
					}

					if (isZeroLength(node)) {
						context.report({
							message: `The capturing group ${node.raw} can only capture the empty string.`,
							...reportElement(node)
						});
						return;
					}

					if (node.alternatives.length === 1) {
						const concatenation = node.alternatives[0].elements;
						if (isConstant(concatenation)) {
							context.report({
								message: `The capturing group ${node.raw} can only capture one word.`,
								...reportElement(node)
							});
							return;
						}
					}
				}
			});

		});
	}
};
