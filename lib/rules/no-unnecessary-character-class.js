"use strict";

const { createRuleListener, getDocUrl } = require("../rules-util");
const util = require("../util");


const SPECIAL_CHARACTERS = new Set(".*+?|()[]{}^$/");

const characterSetNegator = {
	"d": "D",
	"D": "d",
	"p": "P",
	"P": "p",
	"s": "S",
	"S": "s",
	"w": "W",
	"W": "w",
};


/** @type {import("eslint").Rule.RuleModule} */
module.exports = {
	meta: {
		type: "suggestion",
		docs: {
			description: "Disallow unnecessary character classes.",
			category: "Best Practices",
			url: getDocUrl(__filename)
		},
		fixable: "code",
		schema: [
			{
				type: "object",
				properties: {
					avoidEscape: {
						type: "boolean"
					}
				},
				additionalProperties: false
			}
		]
	},

	create(context) {
		return createRuleListener(({ visitAST, replaceElement }) => {

			visitAST({
				onCharacterClassEnter(node) {
					if (node.elements.length !== 1) {
						return;
					}

					const element = node.elements[0];
					switch (element.type) {
						case "CharacterSet":
							{
								let set = element.raw;
								if (node.negate) {
									set = `\\${characterSetNegator[set[1]]}${set.substr(2)}`;
								}
								context.report({
									message: "Unnecessary character class.",
									...replaceElement(node, set)
								});
								return;
							}
						case "Character":
							{
								if (node.negate) {
									return;
								}
								if (SPECIAL_CHARACTERS.has(element.raw)) {
									return;
								}
								if (util.isOctalEscape(element)) {
									return;
								}

								break;
							}
					}
				}
			});

		});
	}
};
