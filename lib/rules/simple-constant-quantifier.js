"use strict";

const { createRuleListener, getDocUrl } = require("../rules-util");
const util = require("../util");

/** @type {import("eslint").Rule.RuleModule} */
module.exports = {
	meta: {
		type: "suggestion",
		docs: {
			description: "Prefer simple constant quantifiers over the range form.",
			url: getDocUrl(__filename),
		},
		fixable: "code",
	},

	create(context) {
		return createRuleListener(({ visitAST, replaceQuantifier }) => {
			visitAST({
				onQuantifierEnter(node) {
					if (node.min !== node.max || node.min < 2) {
						// we let no-unnecessary-quantifier handle the {1} case and no-zero-quantifier will handle {0}
						return;
					}

					const currentRaw = util.getQuantifierRaw(node);
					const simpleRaw = util.quantifierToString(node);

					if (simpleRaw !== currentRaw) {
						context.report({
							message: `This constant quantifier can be simplified to "${simpleRaw}".`,
							...replaceQuantifier(node, simpleRaw),
						});
					}
				},
			});
		});
	},
};
