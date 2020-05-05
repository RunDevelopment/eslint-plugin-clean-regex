"use strict";

const { createRuleListener, getDocUrl } = require("../rules-util");
const util = require("../util");


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
						// inside character classes, octal escapes are fine
						return;
					}

					if (node.value > 0 && util.isOctalEscapeSequence(node)) {
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
