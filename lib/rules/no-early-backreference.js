"use strict";

const { createRuleListener, getDocUrl } = require("../rules-util");


/** @type {import("eslint").Rule.RuleModule} */
module.exports = {
	meta: {
		type: "problem",
		docs: {
			description: "Disallow backreferences which appear before the group they reference ends.",
			category: "Possible problem",
			url: getDocUrl(__filename)
		}
	},

	create(context) {
		return createRuleListener(({ visitAST, reportElement }) => {

			visitAST({
				onBackreferenceEnter(node) {
					if (node.start < node.resolved.end) {
						context.report({
							message: "The backreference will always be replaced with an empty string because it appears before the referenced capturing group ends.",
							...reportElement(node)
						});
					}
				}
			});

		});
	}
};
