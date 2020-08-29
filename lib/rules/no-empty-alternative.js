"use strict";

const { createRuleListener, getDocUrl } = require("../rules-util");


/**
 * @typedef {import("regexpp/ast").CapturingGroup} CapturingGroup
 * @typedef {import("regexpp/ast").Group} Group
 * @typedef {import("regexpp/ast").Pattern} Pattern
 */


/** @type {import("eslint").Rule.RuleModule} */
module.exports = {
	meta: {
		type: "suggestion",
		docs: {
			description: "Disallow alternatives without elements.",
			category: "Possible problem",
			url: getDocUrl(__filename)
		}
	},

	create(context) {
		return createRuleListener(({ visitAST, reportElement }) => {

			/**
			 * @param {CapturingGroup | Group | Pattern} node
			 */
			function checkAlternatives(node) {
				if (node.alternatives.length >= 2) {
					// We want to have at least two alternatives because the zero alternatives isn't possible because of
					// the parser and one alternative is already handled by other rules.
					for (let i = 0 ; i< node.alternatives.length ; i++) {
						const alt = node.alternatives[i];
						if (alt.elements.length === 0) {
							context.report({
								message: "No empty alternatives. Use quantifiers instead.",
								...reportElement(node)
							});
							// don't report the same node multiple times
							return;
						}
					}
				}
			}

			visitAST({
				onGroupEnter: checkAlternatives,
				onCapturingGroupEnter: checkAlternatives,
				onPatternEnter: checkAlternatives,
				// While lookarounds can contain empty alternatives, lookarounds with empty alternatives are already
				// covered by the `no-empty-lookaround`.
			});

		});
	}
};
