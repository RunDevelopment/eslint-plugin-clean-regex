"use strict";

const { createRuleListener, getDocUrl } = require("../rules-util");


/**
 * Returns whether the given element is empty.
 *
 * @param {Element} element
 * @returns {boolean}
 *
 * @typedef {import("regexpp/ast").Alternative} Alternative
 * @typedef {import("regexpp/ast").Element} Element
 */
function elementIsEmpty(element) {
	/** @type {(alts: Alternative[]) => boolean} */
	const alternativesAreEmpty =
		alts => alts.some(a => a.elements.every(e => elementIsEmpty(e)));

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
		return createRuleListener(({ visitAST, reportElement }) => {

			visitAST({
				onAssertionEnter(node) {
					if (elementIsEmpty(node)) {
						context.report({
							message: `The empty ${node.kind} ${node.raw} is non-functional as it matches the empty string.`,
							...reportElement(node)
						});
					}
				}
			});

		});
	}
};
