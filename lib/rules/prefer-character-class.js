"use strict";

const { createRuleListener, getDocUrl } = require("../rules-util");
const util = require("../util");

/**
 * @typedef {import("regexpp/ast").Alternative} Alternative
 * @typedef {import("regexpp/ast").Assertion} Assertion
 * @typedef {import("regexpp/ast").LookaroundAssertion} LookaroundAssertion
 * @typedef {import("regexpp/ast").Element} Element
 * @typedef {import("regexpp/ast").Pattern} Pattern
 * @typedef {import("regexpp/ast").Character} Character
 * @typedef {import("regexpp/ast").CharacterClass} CharacterClass
 * @typedef {import("regexpp/ast").CharacterSet} CharacterSet
 * @typedef {import("regexpp/ast").Group} Group
 * @typedef {import("regexpp/ast").CapturingGroup} CapturingGroup
 * @typedef {import("regexpp/ast").CharacterClassElement} CharacterClassElement
 * @typedef {import("regexpp/ast").Flags} Flags
 *
 * @typedef {import("refa").CharSet} CharSet
 */

/**
 * @typedef {import("../util-types").Simple<T>} Simple
 * @template T
 */

/**
 * Returns the content prefix and suffix of the given parent node.
 *
 * @param {Pattern | CapturingGroup | Group | LookaroundAssertion} parent
 * @returns {[string, string]}
 */
function getParentPrefixAndSuffix(parent) {
	switch (parent.type) {
		case "Assertion":
			return ["(?" + (parent.kind === "lookahead" ? "" : "<") + (parent.negate ? "!" : "="), ")"];

		case "CapturingGroup":
			if (parent.name !== null) {
				return ["(?<" + parent.name + ">", ")"];
			} else {
				return ["(", ")"];
			}

		case "Group":
			return ["(?:", ")"];

		case "Pattern":
			return ["", ""];

		default:
			throw util.assertNever(parent);
	}
}

/**
 * Tries to convert the given element into character class elements.
 *
 * The returned array may be empty.
 *
 * @param {Element} element
 * @returns {CharElementArray | null}
 *
 * @typedef {Readonly<Simple<CharacterClassElement>>[]} CharElementArray
 */
function toCharacterClassElement(element) {
	if (element.type === "CharacterSet") {
		// normal dot is not possible (it technically is but it's complicated)
		if (element.kind === "any") {
			return null;
		} else {
			return [element];
		}
	} else if (element.type === "CharacterClass") {
		if (!element.negate) {
			return [...element.elements];
		}
		// we can't (easily) combine negated character classes
		// but can if the only element is a character set
		if (element.elements.length === 1 && element.elements[0].type === "CharacterSet") {
			const set = element.elements[0];
			if (set.kind === "property") {
				const p = set.raw.substr(0, 2);
				const raw = (set.negate ? p.toLowerCase() : p.toUpperCase()) + set.raw.substr(2);
				return [{
					type: "CharacterSet",
					kind: set.kind,
					key: set.key,
					value: set.value,
					negate: !set.negate,
					raw
				}];
			} else {
				const raw = set.negate ? set.raw.toLowerCase() : set.raw.toUpperCase();
				return [{
					type: "CharacterSet",
					kind: set.kind,
					negate: !set.negate,
					raw,
				}];
			}
		}
		return null;
	} else if (element.type === "Character") {
		return [element];
	} else {
		return null;
	}
}

/**
 * Given alternatives, this will return an array in which each alternative is categorized by whether it contains only a
 * single character (that can be combined with other characters in a character class) or not.
 *
 * @param {readonly Alternative[]} alternatives
 * @param {Flags} flags
 * @returns {(CharacterAlternative | NonCharacterAlternative)[]}
 *
 * @typedef CharacterAlternative
 * @property {true} isCharacter
 * @property {Alternative} alternative
 * @property {CharElementArray} elements
 * @property {CharSet} char
 *
 * @typedef NonCharacterAlternative
 * @property {false} isCharacter
 * @property {Alternative} alternative
 */
function categorizeAlternatives(alternatives, flags) {
	/** @type {(CharacterAlternative | NonCharacterAlternative)[]} */
	const result = [];
	for (const alternative of alternatives) {
		if (alternative.elements.length === 1) {
			const elements = toCharacterClassElement(alternative.elements[0]);
			if (elements) {
				result.push({
					isCharacter: true,
					alternative,
					elements,
					char: util.toCharSet(elements, flags)
				});
				continue;
			}
		}
		result.push({
			isCharacter: false,
			alternative
		});
	}
	return result;
}

/**
 * @param {readonly (CharacterAlternative | NonCharacterAlternative)[]} alternatives
 * @returns {CharElementArray}
 */
function combineElements(alternatives) {
	/** @type {CharElementArray} */
	const elements = [];
	for (const a of alternatives) {
		if (a.isCharacter) {
			elements.push(...a.elements);
		}
	}
	return elements;
}

/**
 *
 * @param {readonly (CharacterAlternative | NonCharacterAlternative)[]} alternatives
 * @param {Flags} flags
 * @returns {(GenericCharAlt | GenericNonCharAlt)[]}
 *
 * @typedef GenericCharAlt
 * @property {true} isCharacter
 * @property {string} raw
 * @property {CharSet} char
 * @property {CharElementArray} elements
 *
 * @typedef GenericNonCharAlt
 * @property {false} isCharacter
 * @property {string} raw
 * @property {import("../util-types").FirstChar} firstChar
 */
function toGenericAlts(alternatives, flags) {
	/** @type {(GenericCharAlt | GenericNonCharAlt)[]} */
	const result = [];
	for (const a of alternatives) {
		if (a.isCharacter) {
			result.push({
				isCharacter: true,
				elements: a.elements,
				char: a.char,
				raw: a.alternative.raw
			});
		} else {
			result.push({
				isCharacter: false,
				firstChar: util.getFirstCharOf(a.alternative, util.matchingDirection(a.alternative), flags),
				raw: a.alternative.raw
			});
		}
	}
	return result;
}

/**
 * @param {(GenericCharAlt | GenericNonCharAlt)[]} alternatives
 * @param {Flags} flags
 * @param {boolean} reorder
 */
function optimizeCharacterAlternatives(alternatives, flags, reorder) {

	/**
	 * @param {GenericCharAlt} a
	 * @param {GenericCharAlt} b
	 * @returns {GenericCharAlt}
	 */
	function merge(a, b) {
		const elements = [...a.elements, ...b.elements];
		return {
			isCharacter: true,
			char: a.char.union(b.char),
			elements,
			raw: util.elementsToCharacterClass(elements)
		};
	}

	function mergeRuns() {
		for (let i = 1; i < alternatives.length; i++) {
			const prev = alternatives[i - 1];
			const curr = alternatives[i];

			if (prev.isCharacter && curr.isCharacter) {
				alternatives[i - 1] = merge(prev, curr);
				alternatives.splice(i, 1);
				i--;
			}
		}
	}

	function mergeWithReorder() {
		// Here's how the merge algorithm works:
		//
		// We go through all alternatives from left to right. If we find a character alternative A, we will merge all
		// following character alternatives into it until
		// 1) we find a non-character alternative with a first character that can be the empty string,
		// 2) we find a non-character alternative B such that the union of first character in B is the "all" set, or
		// 3) we find a character alternative C such that C is not disjoint with the union of all the first characters
		//    of all non-character alternatives between A and C.
		//
		// This re-ordering approach has the following properties:
		// a) It keeps the order of non-character alternatives and the order of character alternatives intact.
		// b) It runs in O(n) with n being the number of alternatives.

		for (let i = 0; i < alternatives.length - 1; i++) {
			let curr = alternatives[i];
			if (!curr.isCharacter) {
				continue;
			}

			/**
			 * The union of all character sets a char alternative has to be disjoint with in order to be moved.
			 *
			 * @type {CharSet | undefined}
			 */
			let nonCharTotal = undefined;
			for (let j = i + 1; j < alternatives.length; j++) {
				const far = alternatives[j];
				if (far.isCharacter) {
					// character alternative
					if (nonCharTotal === undefined || far.char.isDisjointWith(nonCharTotal)) {
						curr = merge(curr, far);
						alternatives.splice(j, 1);
						j--;
					} else {
						break;
					}
				} else {
					// non-character alternative
					if (far.firstChar.nonEmpty) {
						if (nonCharTotal === undefined) {
							nonCharTotal = far.firstChar.char;
						} else {
							nonCharTotal = nonCharTotal.union(far.firstChar.char);
						}
						if (nonCharTotal.isAll) {
							// Since, it's impossible for any non-empty character set to be disjoint with the "all" set,
							// we can stop right here.
							break;
						}
					} else {
						// this means that the `far` alternative accepts the empty word.
						// Since we don't know what comes after the alternative, we have to assume that it may be any
						// character, meaning that `nonCharTotal` will be set to the "all" character set.
						break;
					}
				}
			}

			alternatives[i] = curr;
		}
	}

	if (reorder) {
		mergeWithReorder();
	} else {
		mergeRuns();
	}
}

/**
 * Return whether all character alternatives are disjoint with each other.
 *
 * @param {Iterable<CharacterAlternative | NonCharacterAlternative>} alternatives
 * @returns {CharacterAlternative | null}
 */
function findNonDisjointAlt(alternatives) {
	/** @type {CharSet | undefined} */
	let total = undefined;
	for (const a of alternatives) {
		if (a.isCharacter) {
			if (total === undefined) {
				total = a.char;
			} else {
				if (!total.isDisjointWith(a.char)) {
					return a;
				}
				total = total.union(a.char);
			}
		}
	}
	return null;
}

/**
 *
 * @param {Iterable<CharacterAlternative | NonCharacterAlternative>} alternatives
 * @returns {boolean}
 */
function totalIsAll(alternatives) {
	/** @type {CharSet | undefined} */
	let total = undefined;
	for (const a of alternatives) {
		if (a.isCharacter) {
			if (total === undefined) {
				total = a.char;
			} else {
				total = total.union(a.char);
			}
		}
	}
	return total !== undefined && total.isAll;
}


/** @type {import("eslint").Rule.RuleModule} */
module.exports = {
	meta: {
		type: "suggestion",
		docs: {
			description: "Prefer character classes wherever possible instead of alternations.",
			category: "Best Practices",
			url: getDocUrl(__filename)
		},
		fixable: "code"
	},

	create(context) {
		return createRuleListener(({ visitAST, flags, replaceElement, reportElement }) => {

			/**
			 * @param {Pattern | CapturingGroup | Group | Assertion} node
			 * @returns {void}
			 */
			function process(node) {
				if (!("alternatives" in node)) {
					return;
				}

				if (node.alternatives.length < 2) {
					// we need at least 2 alternatives with characters to make this work
					return;
				}

				const alts = categorizeAlternatives(node.alternatives, flags);
				const characterAlternativesCount = alts.filter(a => a.isCharacter).length;

				if (characterAlternativesCount < 2) {
					// we need at least 2 character alternatives
					return;
				}

				if (alts.every(a => a.isCharacter)) {
					// all alternatives are characters
					//
					// We will only suggest to merge the characters if
					// 1) there are >= 3 character alternatives, or
					// 2) the characters of the character alternatives are not disjoint, or
					// 3) the union of all character alternatives is the "all" set.

					if (alts.length >= 3 || findNonDisjointAlt(alts) || totalIsAll(alts)) {
						const [prefix, suffix] = node.type === "Group" ? ["", ""] : getParentPrefixAndSuffix(node);
						const replacement = prefix + util.elementsToCharacterClass(combineElements(alts)) + suffix;

						context.report({
							message: `This can be replaced with ${replacement}.`,
							...replaceElement(node, replacement)
						});
					}
					return;
				}

				// This is the general case:
				// We have both character and non-character alternatives. The following will try to merge character
				// alternatives and might even re-order alternatives to do so.
				//
				// We will only try to optimize alternatives if
				// 1) there are >= 3 character alternatives, or
				// 2) the characters of the character alternatives are not disjoint, or
				// 3) the union of all character alternatives is the "all" set.

				const nonDisjointAlt = findNonDisjointAlt(alts);

				if (nonDisjointAlt || characterAlternativesCount >= 3 || totalIsAll(alts)) {
					const genericAlts = toGenericAlts(alts, flags);
					optimizeCharacterAlternatives(genericAlts, flags, true);

					const [prefix, suffix] = getParentPrefixAndSuffix(node);
					const newRaw = prefix + genericAlts.map(a => a.raw).join("|") + suffix;

					if (newRaw !== node.raw) {
						// Something (don't know what exactly) was changed
						context.report({
							message: `This can be replaced with ${newRaw}.`,
							...replaceElement(node, newRaw)
						});
						return;
					}
				}

				// If we made it here, we couldn't optimize any character alternatives.
				// But there might still be unmerged non-disjoint character alternatives that can cause exponential
				// backtracking. We can't fix them but we can at least warn the user.

				if (nonDisjointAlt) {
					let expMessage;
					if (util.underAStar(node)) {
						expMessage = "\nThis ambiguity is very likely to cause exponential backtracking.";
					} else {
						expMessage = "";
					}

					context.report({
						message: `The set of characters accepted by ${nonDisjointAlt.alternative.raw} is not disjoint with the set of characters accepted by previous alternatives. Try to remove this ambiguity.` + expMessage,
						...reportElement(nonDisjointAlt.alternative)
					});
					return;
				}
			}

			visitAST({
				onAssertionEnter: process,
				onCapturingGroupEnter: process,
				onGroupEnter: process,
				onPatternEnter: process
			});

		});
	}
};
