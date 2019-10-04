"use strict";

const { createRuleListener, getDocUrl } = require("../rules-util");


/**
 *
 * @param {import("regexpp/ast").Alternative[]} alternatives
 * @returns {import("regexpp/ast").Quantifier[]}
 */
function getLooseEnds(alternatives) {
	/** @type {import("regexpp/ast").Quantifier[]} */
	const looseEnds = [];

	for (const { elements } of alternatives) {
		if (elements.length > 0) {
			const last = elements[elements.length - 1];
			switch (last.type) {
				case "Quantifier":
					if (last.min != last.max) {
						looseEnds.push(last);
					}
					break;

				case "Group":
					looseEnds.push(...getLooseEnds(last.alternatives));
					break;

				// we ignore capturing groups on purpose.
				// Example: /(?=(a*))\w+\1/ (no ideal but it illustrates the point)

				default:
					break;
			}
		}
	}

	return looseEnds;
}


/** @type {import("eslint").Rule.RuleModule} */
module.exports = {
	meta: {
		type: "problem",
		docs: {
			description: "Disallows the alternatives of lookarounds the end with a non-constant quantifier.",
			category: "Possible Errors",
			url: getDocUrl(__filename)
		}
	},

	create(context) {
		return createRuleListener(({ visitAST, reportElement }) => {

			visitAST({
				onAssertionEnter(node) {
					if (node.kind === "lookahead" || node.kind === "lookbehind") {
						const looseEnds = getLooseEnds(node.alternatives);

						for (const end of looseEnds) {
							let proposal;
							if (end.min == 0) {
								proposal = "removed";
							} else if (end.min == 1) {
								proposal = `replaced with ${end.element.raw}`;
							} else {
								proposal = `replaced with ${end.element.raw}{${end.min}}`;
							}

							context.report({
								message: `The quantified expression ${end.raw} at the end of the expression tree should only be matched a constant number of times. The expression can be ${proposal} without affecting the lookaround.`,
								...reportElement(end)
							});
						}
					}
				}
			});

		});
	}
};
