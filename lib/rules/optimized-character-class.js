"use strict";

const { createRuleListener, getDocUrl } = require("../rules-util");
const util = require("../util");

const hex = util.minimalHexEscape;


/** @type {Object<string, RegExp>} */
const REGEX_CACHE = {};
/**
 *
 * @param {string} pattern
 * @param {string} [flags]
 * @returns {RegExp}
 */
function getRegex(pattern, flags = "") {
	const key = flags + "/" + pattern;
	return REGEX_CACHE[key] || (REGEX_CACHE[key] = RegExp(pattern, flags));
}


/** @type {import("eslint").Rule.RuleModule} */
module.exports = {
	meta: {
		type: "suggestion",
		docs: {
			description: "Disallows unnecessary elements in character classes.",
			category: "Best Practices",
			url: getDocUrl(__filename)
		},
		fixable: "code"
	},

	create(context) {
		return createRuleListener(({ visitAST, flags, removeElement }) => {


			const ignoreCase = flags.ignoreCase;
			const testFlags = flags.raw.replace(/[mysg]/g, "");

			/**
			 * @param {import("regexpp/ast").Character} char
			 * @returns {RegExp}
			 */
			const charToRegex = (char) => getRegex(`^[${hex(char.value)}]$`, testFlags);
			/**
			 * @param {import("regexpp/ast").CharacterClassRange} range
			 * @returns {RegExp}
			 */
			const rangeToRegex = (range) => getRegex(`^[${hex(range.min.value)}-${hex(range.max.value)}]$`, testFlags);
			/**
			 * @param {import("regexpp/ast").CharacterSet} set
			 * @returns {RegExp}
			 */
			const setToRegex = (set) => getRegex(`^[${set.raw}]$`, testFlags);

			visitAST({
				onCharacterClassEnter(node) {
					const elements = node.elements;
					if (elements.length <= 1) // char classes with <= 1 elements are always optimal
						return;

					// the following algorithm runs in O(n^2) but that _should_ be fast enough

					/**
					 * @param {import("regexpp/ast").Character} needle
					 * @param {number} index
					 * @returns {boolean}
					 */
					function checkChar(needle, index) {
						for (let i = 0; i < elements.length; i++) {
							if (i == index) continue;
							const element = elements[i];

							let report = false;
							switch (element.type) {
								case "Character":
									if (i < index) {
										report = element.value === needle.value;
										if (!report && ignoreCase) {
											const re = charToRegex(element);
											report = re.test(String.fromCodePoint(needle.value));
										}
									}
									break;

								case "CharacterClassRange":
									report = needle.value >= element.min.value && needle.value <= element.max.value;
									if (!report && ignoreCase) {
										report = rangeToRegex(element).test(String.fromCodePoint(needle.value));
									}
									break;

								case "CharacterSet":
									report = setToRegex(element).test(String.fromCodePoint(needle.value));
									break;
							}

							if (report) {
								context.report({
									message: `${needle.raw} (${
										hex(needle.value)}) is already included by ${element.raw}.`,
									...removeElement(needle)
								});
								return true;
							}
						}

						return false;
					}

					/**
					 * @param {import("regexpp/ast").CharacterClassRange} needle
					 * @param {number} index
					 * @returns {boolean}
					 */
					function checkRange(needle, index) {
						const max = needle.max.value;
						const min = needle.min.value;

						for (let i = 0; i < elements.length; i++) {
							if (i === index) continue;
							const element = elements[i];

							let report = false;
							switch (element.type) {
								case "CharacterClassRange":
									{
										// Most of the checks here make one assumption regarding case invariance:
										// For every range of lowercase characters _a_ and range _b_ of uppercase
										// characters of _a_, there exists at least one character between _a_ and
										// _b_.

										// the difference of the numbers of characters matched
										const diff = (element.max.value - element.min.value) - (max - min);
										// There are two cases:
										//  1. diff >  0: needle can only be a subset of element
										//  2. diff == 0: needle can be equal to element, overlap or be disjoint.
										//                In the overlap and disjoint case, report has to be false.
										//                If equal, only report the latter range.
										if (diff > 0 || diff === 0 && i < index) {
											report = min >= element.min.value && max <= element.max.value;
											if (!report && ignoreCase) {
												report = true;
												const re = rangeToRegex(element);
												for (let c = min; c < max; c++) {
													if (!re.test(String.fromCodePoint(c))) {
														report = false;
														break;
													}
												}
											}
										}
										break;
									}

								case "CharacterSet":
									{
										report = true;
										const re = setToRegex(element);
										for (let c = min; c < max; c++) {
											if (!re.test(String.fromCodePoint(c))) {
												report = false;
												break;
											}
										}
									}
									break;
							}

							if (report) {
								context.report({
									message: `${needle.raw} (${
										hex(needle.min.value)}-${hex(needle.max.value)
										}) is already included by ${element.raw}.`,
									...removeElement(needle)
								});
								return true;
							}
						}

						return false;
					}

					/**
					 * @param {import("regexpp/ast").EscapeCharacterSet | import("regexpp/ast").UnicodePropertyCharacterSet} needle
					 * @param {number} index
					 * @returns {boolean}
					 */
					function checkSet(needle, index) {
						for (let i = 0; i < elements.length; i++) {
							if (i === index) continue;
							const element = elements[i];

							let report = false;
							switch (element.type) {
								case "CharacterSet":
									if (element.kind === needle.kind) {
										if (element.negate === needle.negate && i < index) {
											report = true;
										}
									} else if (element.kind !== "property" && needle.kind !== "property") {
										const needleLetter = needle.raw[1];
										const elementLetter = element.raw[1];
										/** @type {Object<string, string[]>} */
										const superSetsOf = {
											"d": ["w"],
											"D": [],
											"s": [],
											"S": [],
											"w": ["S"],
											"W": ["D"],
										};
										report = superSetsOf[needleLetter].includes(elementLetter);
									}
									break;
							}

							if (report) {
								context.report({
									message: `${needle.raw} is already included by ${element.raw}.`,
									...removeElement(needle)
								});
								return true;
							}
						}

						return false;
					}


					for (let i = 0; i < elements.length; i++) {
						const element = elements[i];
						switch (element.type) {
							case "Character":
								checkChar(element, i);
								break;

							case "CharacterClassRange":
								checkRange(element, i);
								break;

							case "CharacterSet":
								checkSet(element, i);
								break;

							default:
								break;
						}
					}
				}
			});

		});
	}
};
