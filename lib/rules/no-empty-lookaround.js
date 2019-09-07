"use strict";

const { visitRegExpAST } = require("regexpp");
const { createRuleListener, getDocUrl } = require("../rules-util");


/**
 *
 * @param {import("regexpp/ast").Alternative[]} alts
 */
function alternativesAreEmpty(alts) {
	return alts.some(alt => {
		for (const element of alt.elements) {
			if (!elementIsEmpty(element)) {
				return false;
			}
		}
		return true;
	});
}
/**
 *
 * @param {import("regexpp/ast").Element} element
 */
function elementIsEmpty(element) {
	switch (element.type) {
		case "Assertion":
			if (element.kind === "lookahead" || element.kind === "lookbehind") {
				return alternativesAreEmpty(element.alternatives);
			} else {
				return false;
			}

		case "Quantifier":
			return element.min == 0 || elementIsEmpty(element.element);

		case "Group":
		case "CapturingGroup":
			return alternativesAreEmpty(element.alternatives);

		default:
			return false;
	}
}


/** @type {import("eslint").Rule.RuleModule} */
module.exports = {
	meta: {
		type: "problem",
		docs: {
			description: "Disallow lookarounds which can match the empty string.",
			category: "Possible Errors",
			url: getDocUrl(__filename)
		}
	},

	create(context) {
		return createRuleListener(({ pattern, reportElement }) => {

			visitRegExpAST(pattern, {
				onAssertionEnter(node) {
					if (node.kind === "lookahead" || node.kind === "lookbehind") {
						if (elementIsEmpty(node)) {
							context.report({
								message: `The ${node.kind} ${node.raw} should not match the empty string as this will cause it to always match.`,
								...reportElement(node)
							});
						}
					}
				}
			});

		});
	}
};
