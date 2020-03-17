"use strict";

const { createRuleListener, getDocUrl } = require("../rules-util");


/** @type {import("eslint").Rule.RuleModule} */
module.exports = {
	meta: {
		type: "problem",
		docs: {
			description: "Disallow lone unescaped closing square brackets.",
			category: "Possible problem",
			url: getDocUrl(__filename)
		},
		fixable: "code"
	},

	create(context) {
		return createRuleListener(({ visitAST, replaceElement }) => {

			visitAST({
				onCharacterEnter(node) {
					if (node.raw === "]") {
						context.report({
							message: "This closing square is unescaped.",
							...replaceElement(node, "\\]")
						});
					}
				}
			});

		});
	}
};
