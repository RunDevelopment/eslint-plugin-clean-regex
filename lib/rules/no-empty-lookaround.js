"use strict";

const { createRuleListener, getDocUrl } = require("../rules-util");
const { isPotentiallyEmpty } = require("../util");


/** @type {import("eslint").Rule.RuleModule} */
module.exports = {
	meta: {
		type: "problem",
		docs: {
			description: "Disallow lookarounds that can match the empty string.",
			url: getDocUrl(__filename)
		}
	},

	create(context) {
		return createRuleListener(({ visitAST, reportElement }) => {

			visitAST({
				onAssertionEnter(node) {
					if (node.kind !== "lookahead" && node.kind !== "lookbehind") {
						return; // we don't need to check standard assertions
					}

					// we have to check the alternatives ourselves because negative lookarounds which trivially reject
					// cannot match the empty string.
					const empty = isPotentiallyEmpty(node.alternatives);

					if (empty) {
						context.report({
							message: `The ${node.kind} ${node.raw} is non-functional as it matches the empty string. It will always trivially ${node.negate ? "reject" : "accept"}.`,
							...reportElement(node)
						});
					}
				}
			});

		});
	}
};
