"use strict";

const { createRuleListener, getDocUrl } = require("../rules-util");
const { JS } = require("refa");
const util = require("../util");

/**
 * @typedef {import("regexpp/ast").CharacterClassElement} CharacterClassElement
 * @typedef {import("regexpp/ast").Node} Node
 */

/**
 * @typedef {import("../util-types").Simple<T>} Simple
 * @template T
 */

/**
 * @param {Node} node
 * @returns {boolean}
 */
function isDigitRange(node) {
	return node.type === "CharacterClassRange" && node.min.value === 0x30 && node.max.value === 0x39;
}

/** @type {import("eslint").Rule.RuleModule} */
module.exports = {
	meta: {
		type: "suggestion",
		docs: {
			description: "Prefer predefined character sets instead of their more verbose form.",
			url: getDocUrl(__filename),
		},
		fixable: "code",
		schema: [
			{
				type: "object",
				properties: {
					allowDigitRange: {
						type: "boolean",
					},
				},
				additionalProperties: false,
			},
		],
	},

	create(context) {
		const options = context.options[0] || {};
		const allowDigitRange = options.allowDigitRange === undefined ? true : !!options.allowDigitRange;

		return createRuleListener(({ visitAST, flags, replaceElement, reportElements }) => {
			const digitChars = JS.createCharSet([{ kind: "digit", negate: false }], flags);
			const wordChars = JS.createCharSet([{ kind: "word", negate: false }], flags);
			const EMPTY = JS.createCharSet([], flags);

			visitAST({
				onCharacterClassEnter(node) {
					const elements = node.elements;

					if (elements.some(e => e.type === "CharacterSet" && e.kind === "word" && !e.negate)) {
						// this will only so \d and \w, so if \w is already present, we can't do anything
						return;
					}

					const chars = elements.map(e => util.toCharSet([e], flags));

					// try to do \w

					/** @type {number[]} */
					const hits = [];
					chars.forEach((c, i) => {
						if (wordChars.isSupersetOf(c)) {
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

					let union = EMPTY.union(...hits.map(i => chars[i]));
					if (union.equals(wordChars)) {
						const replacement = getCharacterClass({
							type: "CharacterSet",
							kind: "word",
							negate: false,
							raw: "\\w",
						});

						context.report({
							message: "Some of the character class elements can be simplified to \\w.",
							...replaceElement(node, replacement),
							...reportElements(hits.map(i => elements[i])), // override report range
						});
						return;
					}

					// try to do \d

					if (elements.some(e => e.type === "CharacterSet" && e.kind === "digit" && !e.negate)) {
						return;
					}

					hits.length = 0;
					chars.forEach((c, i) => {
						if (digitChars.isSupersetOf(c)) {
							hits.push(i);
						}
					});

					union = EMPTY.union(...hits.map(i => chars[i]));
					if (union.equals(digitChars)) {
						const isAllowedDigitRange = allowDigitRange && hits.every(i => isDigitRange(elements[i]));
						// only suggest a fix if it isn't an allowed digit range or if the whole character class is
						// equal to \d
						if (!isAllowedDigitRange || hits.length === elements.length) {
							const replacement = getCharacterClass({
								type: "CharacterSet",
								kind: "digit",
								negate: false,
								raw: "\\d",
							});

							context.report({
								message: "Some of the character class elements can be simplified to \\d.",
								...replaceElement(node, replacement),
								...reportElements(hits.map(i => elements[i])), // override report range
							});
							return;
						}
					}
				},
			});
		});
	},
};
