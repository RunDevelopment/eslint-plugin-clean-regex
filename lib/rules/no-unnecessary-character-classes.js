"use strict";

const { visitRegExpAST } = require("regexpp");
const { createRuleListener } = require("../rules-util");


const SPECIAL_CHARACTERS = new Set(".*+?()[]{}^$/");

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
			description: "disallow unnecessary character classes",
			category: "Best Practices",
			recommended: true,
			url: "https://eslint.org/docs/rules/no-extra-semi"
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
		return createRuleListener(({ pattern, replaceElement }) => {

			visitRegExpAST(pattern, {
				onCharacterClassEnter(node) {
					if (node.elements.length !== 1)
						return;

					const element = node.elements[0];
					switch (element.type) {
						case "CharacterSet":
							{
								let set = element.raw;
								if (node.negate) {
									set = `\\${characterSetNegator[set[1]]}${set.substr(2)}`;
								}
								const newPattern = `${pattern.raw.substr(0, node.start)}${set}${pattern.raw.substr(node.end)}`;
								context.report({
									// TODO: message
									message: "message.",
									...replaceElement(pattern, newPattern)
								});
								break;
							}

						case "Character":

							break;

						default:
							break;
					}
				}
			});

		});
	}
};
