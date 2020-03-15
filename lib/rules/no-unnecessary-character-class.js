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
		const avoidEscape = !!(context.options[0] || {}).avoidEscape;

		return createRuleListener(({ visitAST, pattern, parseExpression, replaceElement }) => {

			visitAST({
				onCharacterClassEnter(node) {
					if (node.elements.length !== 1) {
						return;
					}

					const element = node.elements[0];
					if (element.type === "CharacterSet") {
						// e.g. \s \W \p{SOME_NAME}
						let set = element.raw;
						if (node.negate) {
							set = `\\${characterSetNegator[set[1]]}${set.substr(2)}`;
						}

						context.report({
							message: "Unnecessary character class.",
							...replaceElement(node, set)
						});
					} else if (element.type === "Character") {
						if (node.negate) {
							// can't do anything. e.g. [^a]
							return;
						}
						if (util.isOctalEscape(element)) {
							// don't use octal escapes outside character classes
							return;
						}

						if (element.raw === "\\b") {
							// \b means backspace in character classes, so we have to escape it
							if (!avoidEscape) {
								context.report({
									message: "Unnecessary character class.",
									...replaceElement(node, "\\x08")
								});
							}
							return;
						}

						if (SPECIAL_CHARACTERS.has(element.raw)) {
							// special characters like `.+*?()`
							if (!avoidEscape) {
								context.report({
									message: "Unnecessary character class.",
									...replaceElement(node, "\\" + element.raw)
								});
							}
							return;
						}

						if (util.isEscapeSequence(element)) {
							// sequences like `\n` `\xFF`
							// It's not an octal escape. Those were handled before.
							if (!avoidEscape) {
								context.report({
									message: "Unnecessary character class.",
									...replaceElement(node, element.raw)
								});
							}
							return;
						}

						if (/^\\[^kbBpP]$/.test(element.raw)) {
							// except for a select few, all escaped characters can be copied as is
							context.report({
								message: "Unnecessary character class.",
								...replaceElement(node, element.raw)
							});
							return;
						}

						// At this point we will just insert the character as is but this might lead to syntax changes
						// in some edge cases (see test file). To prevent this, we will re-parse the pattern with the
						// character class replaced by the character literal and if the re-parsed pattern does not
						// change, aside from the character literal, the character class is unnecessary.
						// (we also have to check that the character literal has the same value)

						const parent = node.parent;
						const before = pattern.raw.substr(0, node.start - pattern.start);
						const after = pattern.raw.substr(node.end - pattern.start);
						const withoutCharacterClass = before + element.raw + after;
						const ast = parseExpression(withoutCharacterClass);
						if (ast) {
							// replace the group with its contents in the original AST

							let equal;
							if (parent.type === "Alternative") {
								const parentIndex = parent.elements.indexOf(node);

								const oldElements = parent.elements;
								const newElements = [
									...parent.elements.slice(0, parentIndex),
									element,
									...parent.elements.slice(parentIndex + 1)
								];

								parent.elements = newElements;

								try {
									equal = util.areEqual(pattern, ast);
								} finally {
									// switch back
									parent.elements = oldElements;
								}

							} else {
								parent.element = element;

								try {
									equal = util.areEqual(pattern, ast);
								} finally {
									// switch back
									parent.element = node;
								}
							}

							if (equal) {
								context.report({
									message: "Unnecessary character class.",
									...replaceElement(node, element.raw)
								});
							}
						}
					}
				}
			});

		});
	}
};
