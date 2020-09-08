"use strict";

const { createRuleListener, getDocUrl } = require("../rules-util");
const util = require("../util");
const { JS } = require("refa");

/**
 * @typedef {import("refa").CharSet} CharSet
 *
 * @typedef {import("regexpp/ast").Assertion} Assertion
 * @typedef {import("regexpp/ast").CharacterClass} CharacterClass
 * @typedef {import("regexpp/ast").CharacterSet} CharacterSet
 * @typedef {import("regexpp/ast").Flags} Flags
 * @typedef {import("regexpp/ast").LookaroundAssertion} LookaroundAssertion
 */

/** @type {Map<string, CharSet>} */
const _wordCharSetCache = new Map();
/**
 * @param {Flags} flags
 * @returns {CharSet}
 */
function getWordCharSet(flags) {
	let cacheKey = "";
	if (flags.ignoreCase) {
		cacheKey += "i";
	}
	if (flags.unicode) {
		cacheKey += "u";
	}

	let set = _wordCharSetCache.get(cacheKey);
	if (!set) {
		set = JS.createCharSet([{ kind: "word", negate: false }], flags);
		_wordCharSetCache.set(cacheKey, set);
	}
	return set;
}

/**
 * @param {LookaroundAssertion} lookaround
 * @returns {CharacterSet | CharacterClass | null}
 */
function getCharacters(lookaround) {
	if (lookaround.alternatives.length === 1) {
		const alt = lookaround.alternatives[0];
		if (alt.elements.length === 1) {
			const first = alt.elements[0];
			if (first.type === "CharacterSet" || first.type === "CharacterClass") {
				return first;
			}
		}
	}
	return null;
}

/** @type {import("eslint").Rule.RuleModule} */
module.exports = {
	meta: {
		type: "suggestion",
		docs: {
			description: "Prefer predefined assertions over equivalent lookarounds.",
			url: getDocUrl(__filename),
		},
		fixable: "code",
	},

	create(context) {
		return createRuleListener(({ visitAST, flags, replaceElement }) => {
			// /\b/ == /(?:(?<!\w)(?=\w)|(?<=\w)(?!\w))/
			// /\B/ == /(?:(?<=\w)(?=\w)|(?<!\w)(?!\w))/

			/** @param {CharSet} chars */
			const isWord = chars => chars.isSubsetOf(getWordCharSet(flags));
			/** @param {CharSet} chars */
			const isNonWord = chars => chars.isDisjointWith(getWordCharSet(flags));

			/**
			 * @param {LookaroundAssertion} node
			 * @param {boolean} wordNegated
			 */
			function replaceWordAssertion(node, wordNegated) {
				/**
				 * Whether the lookaround is equivalent to (?!\w) / (?<!\w) or (?=\w) / (?<=\w)
				 */
				let lookaroundNegated = node.negate;
				if (wordNegated) {
					// if the lookaround only contains a \W, then we have to negate the lookaround, so it only
					// contains a \w. This is only possible iff we know that the pattern requires at least one
					// character after the lookaround (in the direction of the lookaround).
					//
					// Examples:
					// (?=\W) == (?!\w|$)   ; Here we need to eliminate the $ which can be done by proving that the
					//                        pattern matches another character after the lookahead. Example:
					// (?=\W).+ == (?!\w).+ ; Since we know that the lookahead is always followed by a dot, we
					//                        eliminate the $ alternative because it will always reject.
					// (?!\W).+ == (?=\w|$).+ == (?=\w).+

					const direction = node.kind === "lookahead" ? "ltr" : "rtl";
					const hasNextCharacter = util.getFirstCharAfter(node, direction, flags).nonEmpty;
					if (hasNextCharacter) {
						// we can successfully negate the lookaround
						lookaroundNegated = !lookaroundNegated;
					} else {
						// we couldn't negate the \W, so it's not possible to convert the lookaround into a
						// predefined assertion
						return;
					}
				}

				const otherDirection = util.invertMatchingDirection(node.kind);
				const other = util.getFirstCharAfter(node, otherDirection, flags);
				if (!other.nonEmpty) {
					// to do the branch elimination necessary, we need to know the previous/next character
					return;
				}

				let otherNegated;
				if (isWord(other.char)) {
					// we can think of the previous/next character as \w
					otherNegated = false;
				} else if (isNonWord(other.char)) {
					// we can think of the previous/next character as \W
					otherNegated = true;
				} else {
					// the previous/next character is a subset of neither \w nor \W, so we can't do anything here
					return;
				}

				if (lookaroundNegated === otherNegated) {
					// \B
					context.report({
						message: "This assertion can be replaced with a negated word boundary assertion (\\B).",
						...replaceElement(node, "\\B"),
					});
				} else {
					// \b
					context.report({
						message: "This assertion can be replaced with a word boundary assertion (\\b).",
						...replaceElement(node, "\\b"),
					});
				}
			}
			/**
			 * @param {LookaroundAssertion} node
			 * @param {boolean} multiline
			 */
			function replaceAllAssertion(node, multiline = false) {
				if (!node.negate) {
					return;
				}
				if (flags.multiline === multiline) {
					const replacement = node.kind === "lookahead" ? "$" : "^";
					// suggest the change
					context.report({
						message: `This assertion can be replaced with ${replacement}.`,
						...replaceElement(node, replacement),
					});
				}
			}

			visitAST({
				onAssertionEnter(node) {
					if (node.kind !== "lookahead" && node.kind !== "lookbehind") {
						// this rule doesn't affect predefined assertions
						return;
					}

					const chars = getCharacters(node);
					if (chars === null) {
						return;
					}

					if (chars.type === "CharacterSet") {
						if (chars.kind === "word") {
							replaceWordAssertion(node, chars.negate);
						} else if (chars.kind === "any") {
							if (flags.dotAll) {
								replaceAllAssertion(node);
							} else {
								replaceAllAssertion(node, true);
							}
						} else if (chars.kind === "property") {
							if (util.isMatchAll(chars, flags)) {
								replaceAllAssertion(node);
							}
						}
					} else {
						if (util.isMatchAll(chars, flags)) {
							replaceAllAssertion(node);
						}
					}
				},
			});
		});
	},
};
