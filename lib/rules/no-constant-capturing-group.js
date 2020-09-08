"use strict";

const { createRuleListener, getDocUrl } = require("../rules-util");
const { mention } = require("../format");
const { getConstant } = require("../util");


/** @type {import("eslint").Rule.RuleModule} */
module.exports = {
	meta: {
		type: "suggestion",
		docs: {
			description: "Disallow capturing groups that can match only one word.",
			url: getDocUrl(__filename)
		},
		schema: [
			{
				type: "object",
				properties: {
					"ignoreNonEmpty": {
						type: "boolean"
					}
				},
				additionalProperties: false
			}
		]
	},

	create(context) {
		let ignoreNonEmpty = (context.options[0] || {}).ignoreNonEmpty;
		if (typeof ignoreNonEmpty !== "boolean") {
			ignoreNonEmpty = true;
		}

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
					if (constant && !(ignoreNonEmpty && constant.word !== "")) {
						const word = constant.word ?
							`one word which is ${JSON.stringify(constant.word)}` :
							"the empty string";
						context.report({
							message: `The capturing group ${mention(node)} can only capture ${word}.`,
							...reportElement(node)
						});
						return;
					}
				}
			});

		});
	}
};
