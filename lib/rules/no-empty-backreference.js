"use strict";

const { createRuleListener, getDocUrl } = require("../rules-util");
const util = require("../util");


/** @type {import("eslint").Rule.RuleModule} */
module.exports = {
	meta: {
		type: "problem",
		docs: {
			description: "Disallow backreferences that will always be replaced with the empty string.",
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
						return;
					}

					if (util.isZeroLength(node.resolved)) {
						context.report({
							message: "The referenced capturing group can only match the empty string.",
							...reportElement(node)
						});
						return;
					}

					if (util.isEmptyBackreference(node)) {
						context.report({
							message: "The backreference is not reachable from the referenced capturing group without resetting the captured string.",
							...reportElement(node)
						});
						return;
					}
				}
			});

		});
	}
};
