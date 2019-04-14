/**
 * @fileoverview Rule to disallow useless character classes
 * @author Michael Schmidt
 */
"use strict";

const { RegExpParser, visitRegExpAST } = require("regexpp");
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
			description: "disallow useless character classes",
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

		const parser = new RegExpParser();

		return createRuleListener({
			RegexLiteral(node) {
				const { pattern, flags } = node.regex;

				let ast;
				try {
					ast = parser.parsePattern(pattern, undefined, undefined, flags.includes("u"));
				} catch (error) {
					return; // ignore invalid patterns no-invalid-regex will handle this for us.
				}

				const literalNode = node;

				visitRegExpAST(ast, {
					onCharacterClassEnter(node) {
						if (node.elements.length !== 1)
							return;

						const element = node.elements[0];
						switch (element.type) {
							case "CharacterSet":
								context.report({
									message: "",
									node: literalNode,
									fix(fixer) {
										let set = element.raw;
										if (node.negate) {
											set = `\\${characterSetNegator[set[1]]}${set.substr(2)}`;
										}
										const newPattern = `${pattern.substr(0, node.start)}${set}${pattern.substr(node.end)}`;
										return fixer.replaceText(literalNode, `/${newPattern}/${flags}`);
									}
								});
								break;

							case "Character":

								break;

							default:
								break;
						}
					}
				});
			}
		});
	}
};
