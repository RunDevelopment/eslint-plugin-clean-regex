"use strict";

const { createRuleListener, getDocUrl } = require("../rules-util");
const { Chars, toChars, DIGIT, WORD } = require("../chars");
const util = require("../util");

/**
 * @typedef {import("regexpp/ast").CharacterClassElement} CharacterClassElement
 */

/**
 * @typedef {import("../util-types").Simple<T>} Simple
 * @template T
 */

const DIGIT_CHARS = Chars.empty(0xFFFF).union([DIGIT]);
const WORD_CHARS = Chars.empty(0xFFFF).union(WORD);
const DIGIT_CHARS_U = Chars.empty(0x10FFFF).union([DIGIT]);
const WORD_CHARS_U = Chars.empty(0x10FFFF).union(WORD);


/** @type {import("eslint").Rule.RuleModule} */
module.exports = {
	meta: {
		type: "suggestion",
		docs: {
			description: "Prefer predefined character sets instead of their more verbose form.",
			category: "Best Practices",
			url: getDocUrl(__filename)
		},
		fixable: "code"
	},

	create(context) {
		return createRuleListener(({ visitAST, flags, replaceElement, reportElements }) => {

			const digitChars = flags.unicode ? DIGIT_CHARS_U : DIGIT_CHARS;
			const wordChars = flags.unicode ? WORD_CHARS_U : WORD_CHARS;

			visitAST({
				onCharacterClassEnter(node) {
					const elements = node.elements;

					if (elements.some(e => e.type === "CharacterSet" && e.kind === "word" && !e.negate)) {
						// this will only so \d and \w, so if \w is already present, we can't do anything
						return;
					}

					const chars = elements.map(e => toChars([e], flags));

					// try to do \w

					/** @type {number[]} */
					const hits = [];
					chars.forEach((c, i) => {
						if (wordChars.hasEveryOf(c)) {
							hits.push(i);
						}
					});

					/**
					 * @param {Simple<CharacterClassElement>} hitReplacement
					 */
					function getCharacterClass(hitReplacement) {
						let first = true;
						/** @type {Simple<CharacterClassElement>[]} */
						const newElements = [];
						elements.forEach((e, i) => {
							if (hits.indexOf(i) >= 0) {
								if (first) {
									newElements.push(hitReplacement);
									first = false;
								}
							} else {
								newElements.push(e);
							}
						});
						return util.elementsToCharacterClass(newElements, node.negate);
					}

					let union = Chars.empty(flags.unicode ? 0x10FFFF : 0xFFFF).union(...hits.map(i => chars[i]));
					if (union.equals(wordChars)) {
						const replacement = getCharacterClass({
							type: "CharacterSet",
							kind: "word",
							negate: false,
							raw: "\\w"
						});

						context.report({
							message: "Some of the character class elements can be simplified to \\w.",
							...replaceElement(node, replacement),
							...reportElements(hits.map(i => elements[i])) // override report range
						});
						return;
					}

					// try to do \d

					if (elements.some(e => e.type === "CharacterSet" && e.kind === "digit" && !e.negate)) {
						return;
					}

					hits.length = 0;
					chars.forEach((c, i) => {
						if (digitChars.hasEveryOf(c)) {
							hits.push(i);
						}
					});

					union = Chars.empty(flags.unicode ? 0x10FFFF : 0xFFFF).union(...hits.map(i => chars[i]));
					if (union.equals(digitChars)) {
						const replacement = getCharacterClass({
							type: "CharacterSet",
							kind: "digit",
							negate: false,
							raw: "\\d"
						});

						context.report({
							message: "Some of the character class elements can be simplified to \\d.",
							...replaceElement(node, replacement),
							...reportElements(hits.map(i => elements[i])) // override report range
						});
						return;
					}
				}
			});

		});
	}
};
