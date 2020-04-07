"use strict";

const { createRuleListener, getDocUrl } = require("../rules-util");
const util = require("../util");

/**
 * @typedef {import("regexpp/ast").Alternative} Alternative
 * @typedef {import("regexpp/ast").Element} Element
 * @typedef {import("regexpp/ast").Pattern} Pattern
 * @typedef {import("regexpp/ast").Character} Character
 * @typedef {import("regexpp/ast").CharacterClass} CharacterClass
 * @typedef {import("regexpp/ast").CharacterSet} CharacterSet
 * @typedef {import("regexpp/ast").Group} Group
 * @typedef {import("regexpp/ast").CapturingGroup} CapturingGroup
 * @typedef {import("regexpp/ast").CharacterClassElement} CharacterClassElement
 * @typedef {import("regexpp/ast").Flags} Flags
 */

/**
 * @typedef {import("../util-types").Simple<T>} Simple
 * @template T
 */

/**
 * Returns the content prefix and suffix of the given parent node.
 *
 * @param {Pattern | CapturingGroup | Group} parent
 * @returns {[string, string]}
 */
function getParentContentPrefixAndSuffix(parent) {
	switch (parent.type) {
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
 * @returns {Readonly<Simple<CharacterClassElement>>[] | null}
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
		return createRuleListener(({ visitAST, flags, replaceElement }) => {

			/**
			 * @param {Pattern | CapturingGroup | Group} node
			 * @returns {void}
			 */
			function process(node) {
				const alternatives = node.alternatives;

				if (alternatives.length < 2) {
					// we need at least 2 alternatives with characters to make this work
					return;
				}

				const elements = alternatives.map(alt => {
					if (alt.elements.length === 1) {
						return toCharacterClassElement(alt.elements[0]);
					} else {
						return null;
					}
				});

				/**
				 * Returns whether the characters of the given run should be combined.
				 *
				 * @param {number} runIndex
				 * @param {number} runLength
				 * @returns {boolean}
				 */
				function combineRun(runIndex, runLength) {
					if (runLength >= 3) return true;
					if (runLength <= 1) return false;

					const element1 = /** @type {CharacterSet | CharacterClass | Character} */ (alternatives[runIndex].elements[0]);
					const element2 = /** @type {CharacterSet | CharacterClass | Character} */ (alternatives[runIndex + 1].elements[0]);

					if (element1.type === "CharacterClass" || element2.type === "CharacterClass") {
						// at least one character class in the run
						return true;
					}

					const c1 = util.toCharSet([element1], flags);
					const c2 = util.toCharSet([element2], flags);
					if (c1.hasSomeOf(c2)) {
						// the two are not disjoint
						return true;
					}
					if (c1.isAll || c2.isAll || c1.union(c2).isAll) {
						// the union of both is match all
						return true;
					}

					return false;
				}

				if (elements.every(Boolean)) {
					// all alternatives are single characters
					if (!combineRun(0, alternatives.length)) {
						return;
					}

					/** @type {Readonly<Simple<CharacterClassElement>>[]} */
					const charElements = [];
					elements.forEach(i => charElements.push(...i));

					const [prefix, suffix] =
						node.type === "CapturingGroup" ? getParentContentPrefixAndSuffix(node) : ["", ""];
					const replacement = prefix + util.elementsToCharacterClass(charElements) + suffix;

					context.report({
						message: `This can be replaced with ${replacement}.`,
						...replaceElement(node, replacement)
					});
				} else if (elements.some(Boolean)) {
					// find runs and try to combine those

					/** @type {string[]} */
					const newAlternatives = [];
					let foundRuns = false;

					for (let i = 0; i < elements.length; i++) {
						// element is null
						if (elements[i] === null) {
							newAlternatives.push(alternatives[i].raw);
							continue;
						}

						// find run
						let runLength = 0;
						/** @type {Readonly<Simple<CharacterClassElement>>[]} */
						const runElements = [];
						for (let j = i; j < elements.length; j++) {
							const e = elements[j];
							if (e === null) {
								break;
							} else {
								runElements.push(...e);
								runLength++;
							}
						}

						if (!combineRun(i, runLength)) {
							// run won't be combined
							// add the entire run as is and skip the next few elements
							for (let j = 0; j < runLength; j++) {
								newAlternatives.push(alternatives[i + j].raw);
							}
							i += runLength - 1;
							continue;
						}

						// we will combine the run
						foundRuns = true;
						newAlternatives.push(util.elementsToCharacterClass(runElements));
						i += runLength - 1;
					}

					// we have to find at least one run to make this do anything
					if (foundRuns) {
						const [prefix, suffix] = getParentContentPrefixAndSuffix(node);
						const replacement = prefix + newAlternatives.join("|") + suffix;

						context.report({
							message: `This can be replaced with ${replacement}.`,
							...replaceElement(node, replacement)
						});
					}
				}
			}

			visitAST({
				onCapturingGroupEnter: process,
				onGroupEnter: process,
				onPatternEnter: process
			});

		});
	}
};
