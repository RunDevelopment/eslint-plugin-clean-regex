"use strict";

const { visitRegExpAST } = require("regexpp");
const { createRuleListener, getDocUrl } = require("../rules-util");
const util = require("../util");


/** @type {import("eslint").Rule.RuleModule} */
module.exports = {
	meta: {
		type: "problem",
		docs: {
			description: "Disallow backreferences which appear before the group they reference end.",
			category: "Possible problem",
			url: getDocUrl(__filename)
		}
	},

	create(context) {
		return createRuleListener(({ pattern, reportElement }) => {

			visitRegExpAST(pattern, {
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
