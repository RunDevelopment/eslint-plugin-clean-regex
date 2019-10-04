"use strict";

const { createRuleListener, getDocUrl } = require("../rules-util");


/** @type {import("eslint").Rule.RuleModule} */
module.exports = {
	meta: {
		type: "problem",
		docs: {
			description: "Disallow octal escapes outside of character classes.",
			category: "Possible Errors",
			url: getDocUrl(__filename)
		}
	},

	create(context) {
		return createRuleListener(({ visitAST, reportElement }) => {

			visitAST({
				onCharacterEnter(node) {
					if (node.parent.type === "CharacterClass" || node.parent.type === "CharacterClassRange") {
						return;
					}

					if (/^\\(?:[1-9]|\d{2,})$/.test(node.raw)) {
						context.report({
							message: "Do not use octal escapes because they might be confused with backreferences.",
							...reportElement(node)
						});
					}
				}
			});

		});
	}
};
