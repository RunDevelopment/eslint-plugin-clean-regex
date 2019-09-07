"use strict";

const { visitRegExpAST } = require("regexpp");
const { createRuleListener, getDocUrl } = require("../rules-util");

/**
 * Returns whether the given node trivially nested inside a capturing group.
 *
 * Note that nodes which are closer to an assertion than a capturing group will return `false`
 * as it's not guaranteed that the text matched by the node will be in a parent capturing group.
 *
 * @param {import("regexpp/ast").Node} node
 * @returns {boolean}
 */
function insideCapturingGroup(node) {
	if (node.parent === null) {
		return false;
	} else if (node.parent.type === "CapturingGroup") {
		return true;
	} else if (node.parent.type === "Assertion") {
		return false;
	} else {
		return insideCapturingGroup(node.parent);
	}
}


/** @type {import("eslint").Rule.RuleModule} */
module.exports = {
	meta: {
		type: "suggestion",
		docs: {
			description: "Disallow unnecessary capturing groups.",
			category: "Best Practices",
			url: getDocUrl(__filename)
		},
		schema: []
	},

	create(context) {
		return createRuleListener(({ pattern, reportElement }) => {

			visitRegExpAST(pattern, {
				onCapturingGroupEnter(node) {
					if (node.references.length === 0 && insideCapturingGroup(node)) {
						context.report({
							message: "This capturing is inside another capturing and has no references to it. " +
								"Consider replacing it with a non-capturing group.",
							...reportElement(node)
						});
					}
				}
			});

		});
	}
};
