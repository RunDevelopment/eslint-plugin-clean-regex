"use strict";

const { createRuleListener, getDocUrl } = require("../rules-util");
const util = require("../util");

/**
 * @typedef {import("regexpp/ast").Element} Element
 * @typedef {import("regexpp/ast").QuantifiableElement} QuantifiableElement
 * @typedef {import("regexpp/ast").Flags} Flags
 * @typedef {import("refa").CharSet} CharSet
 */


/**
 *
 * @param {Element} element
 * @param {Flags} flags
 * @returns {{ chars: CharSet; complete: boolean }}
 */
function createChars(element, flags) {
	function empty() {
		return {
			chars: util.emptyCharSet(flags),
			complete: false
		};
	}

	switch (element.type) {
		case "Character":
		case "CharacterSet":
			return {
				chars: util.toCharSet([element], flags),
				complete: true
			};

		case "CharacterClass":
			return {
				chars: util.toCharSet(element, flags),
				complete: true
			};


		case "Group":
		case "CapturingGroup": {
			const results = element.alternatives.map(a => {
				if (a.elements.length === 1) {
					return createChars(a.elements[0], flags);
				} else {
					return empty();
				}
			});
			const union = empty().chars.union(...results.map(({ chars }) => chars));
			return {
				chars: union,
				complete: results.every(({ complete }) => complete)
			};
		}

		default:
			return empty();
	}
}

/**
 *
 * @param {QuantifiableElement} element
 * @param {{ min: number; max: number; greedy?: boolean | undefined; }} quant
 * @returns {string}
 */
function quantize(element, quant) {
	if (quant.min === 0 && quant.max === 0) {
		if (util.hasSomeDescendant(element, d => d.type === "CapturingGroup")) {
			// we can't just remove a capturing group
			return element.raw + "{0}";
		} else {
			return "";
		}
	}
	if (quant.min === 1 && quant.max === 1) {
		return element.raw;
	}
	return element.raw + util.quantifierToString(quant);
}


/** @type {import("eslint").Rule.RuleModule} */
module.exports = {
	meta: {
		type: "suggestion",
		docs: {
			description: "Use optimal quantifiers for concatenated quantified characters.",
			url: getDocUrl(__filename)
		},
		fixable: "code",
		schema: [
			{
				type: "object",
				properties: {
					fixable: {
						type: "boolean",
					}
				},
				additionalProperties: false
			}
		]
	},

	create(context) {
		const options = (context.options[0] || {});
		/** @type {boolean} */
		const fixable = !!options.fixable || options.fixable === undefined;

		return createRuleListener(({ visitAST, flags, replaceElement, reportElements }) => {

			visitAST({
				onAlternativeEnter(node) {
					for (let i = 0; i < node.elements.length - 1; i++) {
						const current = node.elements[i];
						const next = node.elements[i + 1];
						if (current.type === "Quantifier" && current.min !== current.max
							&& next.type === "Quantifier" && next.min !== next.max
							&& (current.max === Infinity || next.max === Infinity)) {
							const currChars = createChars(current.element, flags);
							const nextChars = createChars(next.element, flags);

							let replacement = undefined;
							if (next.max === Infinity && currChars.complete && nextChars.chars.isSupersetOf(currChars.chars)) {
								// currChars is a subset of nextChars
								const currQuant = {
									min: current.min,
									max: current.min,
									greedy: current.greedy
								};
								const nextQuant = {
									min: next.min,
									max: Infinity,
									greedy: next.greedy
								};
								replacement = quantize(current.element, currQuant) + quantize(next.element, nextQuant);
							}
							else if (current.max === Infinity && nextChars.complete && currChars.chars.isSupersetOf(nextChars.chars)) {
								// nextChars is a subset of currChars
								const currQuant = {
									min: current.min,
									max: Infinity,
									greedy: current.greedy
								};
								const nextQuant = {
									min: next.min,
									max: next.min,
									greedy: next.greedy
								};
								replacement = quantize(current.element, currQuant) + quantize(next.element, nextQuant);
							}

							if (replacement) {
								const message = `The quantifiers of ${current.raw}${next.raw} are not optimal and should be replaced with ${replacement}.`;

								if (fixable) {
									const before = node.raw.substr(0, current.start - node.start);
									const after = node.raw.substr(next.end - node.start, node.end - next.end);

									context.report({
										message,
										...replaceElement(node, before + replacement + after),
										...reportElements([current, next]) // overwrite report location
									});
								} else {
									context.report({
										message,
										...reportElements([current, next])
									});
								}
							}
						}
					}
				}
			});

		});
	}
};
