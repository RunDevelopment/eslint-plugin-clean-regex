"use strict";

const { createRuleListener, getDocUrl } = require("../rules-util");
const { getConstant } = require("../util");


/** @type {import("eslint").Rule.RuleModule} */
module.exports = {
	meta: {
		type: "problem",
		docs: {
			description: "Disallow capturing groups which can match one word.",
			category: "Possible Errors",
			url: getDocUrl(__filename)
		},
		schema: [
			{
				type: "object",
				properties: {
					"allowNonEmpty": {
						type: "boolean"
					}
				},
				additionalProperties: false
			}
		]
	},

	create(context) {
		const allowNonEmpty = !!(context.options[0] || {}).allowNonEmpty;

		return createRuleListener(({ visitAST, flags, reportElement }) => {

			visitAST({
				onCapturingGroupEnter(node) {
					if (node.alternatives.length === 1) {
						const concatenation = node.alternatives[0].elements;

						if (concatenation.length === 0) {
							context.report({
								message: "Empty capturing group",
								...reportElement(node)
							});
							return;
						}
					}

					const constant = getConstant(node, flags);
					if (constant && !(allowNonEmpty && constant.word !== "")) {
						const word = constant.word ?
							`one word which is ${JSON.stringify(constant.word)}` :
							"the empty string";
						context.report({
							message: `The capturing group ${node.raw} can only capture ${word}.`,
							...reportElement(node)
						});
						return;
					}
				}
			});

		});
	}
};
