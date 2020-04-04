"use strict";

const { createRuleListener, getDocUrl } = require("../rules-util");
const util = require("../util");


/** @type {import("eslint").Rule.RuleModule} */
module.exports = {
	meta: {
		type: "problem",
		docs: {
			description: "Disallow backreferences whose referenced group might not be matched.",
			category: "Possible Errors",
			url: getDocUrl(__filename)
		}
	},

	create(context) {
		return createRuleListener(({ visitAST, reportElement }) => {

			visitAST({
				onBackreferenceEnter(node) {
					if (util.isEmptyBackreference(node)) {
						// handled by no-empty-backreference
						return;
					}

					if (!util.backreferenceAlwaysAfterGroup(node)) {
						context.report({
							message: "Some path leading to the backreference do not go through the referenced capturing group without resetting its text.",
							...reportElement(node)
						});
					}
				}
			});

		});
	}
};
