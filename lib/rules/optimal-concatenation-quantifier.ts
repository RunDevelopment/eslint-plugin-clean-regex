import { CharSet } from "refa";
import { Element, Flags, QuantifiableElement } from "regexpp/ast";
import { mention, shorten } from "../format";
import { CleanRegexRule, createRuleListener, getDocUrl } from "../rules-util";
import { emptyCharSet, hasSomeDescendant, quantifierToString, toCharSet } from "../util";

function createChars(element: Element, flags: Flags): { chars: CharSet; complete: boolean } {
	function empty() {
		return {
			chars: emptyCharSet(flags),
			complete: false,
		};
	}

	switch (element.type) {
		case "Character":
		case "CharacterSet":
			return {
				chars: toCharSet([element], flags),
				complete: true,
			};

		case "CharacterClass":
			return {
				chars: toCharSet(element, flags),
				complete: true,
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
				complete: results.every(({ complete }) => complete),
			};
		}

		default:
			return empty();
	}
}

function quantize(
	element: QuantifiableElement,
	quant: { min: number; max: number; greedy?: boolean | undefined }
): string {
	if (quant.min === 0 && quant.max === 0) {
		if (hasSomeDescendant(element, d => d.type === "CapturingGroup")) {
			// we can't just remove a capturing group
			return element.raw + "{0}";
		} else {
			return "";
		}
	}
	if (quant.min === 1 && quant.max === 1) {
		return element.raw;
	}
	return element.raw + quantifierToString(quant);
}

function short(str: string): string {
	return shorten(str, 20, "center");
}

interface Replacement {
	raw: string;
	message: string;
}
function getReplacement(current: Element, next: Element, flags: Flags): Replacement | null {
	if (
		current.type === "Quantifier" &&
		current.min !== current.max &&
		next.type === "Quantifier" &&
		next.min !== next.max &&
		(current.max === Infinity || next.max === Infinity)
	) {
		const currChars = createChars(current.element, flags);
		const nextChars = createChars(next.element, flags);

		let currQuant, nextQuant;
		if (next.max === Infinity && currChars.complete && nextChars.chars.isSupersetOf(currChars.chars)) {
			// currChars is a subset of nextChars
			currQuant = {
				min: current.min,
				max: current.min,
				greedy: current.greedy,
			};
			nextQuant = {
				min: next.min,
				max: Infinity,
				greedy: next.greedy,
			};
		} else if (current.max === Infinity && nextChars.complete && currChars.chars.isSupersetOf(nextChars.chars)) {
			// nextChars is a subset of currChars
			currQuant = {
				min: current.min,
				max: Infinity,
				greedy: current.greedy,
			};
			nextQuant = {
				min: next.min,
				max: next.min,
				greedy: next.greedy,
			};
		} else {
			return null;
		}

		const raw = quantize(current.element, currQuant) + quantize(next.element, nextQuant);
		let message;
		if (currQuant.max === 0 && next.max === nextQuant.max && next.min === nextQuant.min) {
			message = `${short(mention(current))} can be removed because it is a subset of ${short(mention(next))}.`;
		} else if (nextQuant.max === 0 && current.max === currQuant.max && current.min === currQuant.min) {
			message = `${short(mention(next))} can be removed because it is a subset of ${short(mention(current))}.`;
		} else {
			message = `They should be replaced with ${mention(raw)}.`;
		}

		if (current.max === Infinity && next.max === Infinity) {
			message += " They might cause excessive backtracking otherwise.";
		}

		return { raw, message };
	} else {
		return null;
	}
}

export default {
	meta: {
		type: "suggestion",
		docs: {
			description: "Use optimal quantifiers for concatenated quantified characters.",
			url: getDocUrl(/* #GENERATED */ "optimal-concatenation-quantifier"),
		},
		fixable: "code",
		schema: [
			{
				type: "object",
				properties: {
					fixable: {
						type: "boolean",
					},
				},
				additionalProperties: false,
			},
		],
	},

	create(context) {
		const options = context.options[0] || {};
		const fixable: boolean = options.fixable != undefined ? options.fixable : true;

		return createRuleListener(({ visitAST, flags, replaceElement, reportElements }) => {
			visitAST({
				onAlternativeEnter(node) {
					for (let i = 0; i < node.elements.length - 1; i++) {
						const current = node.elements[i];
						const next = node.elements[i + 1];
						const replacement = getReplacement(current, next, flags);

						if (replacement) {
							const message =
								`The quantifiers of ${mention(short(current.raw))} and ${mention(
									short(next.raw)
								)} are not optimal. ` + replacement.message;

							if (fixable) {
								const before = node.raw.substr(0, current.start - node.start);
								const after = node.raw.substr(next.end - node.start, node.end - next.end);

								context.report({
									message,
									...replaceElement(node, before + replacement.raw + after),
									...reportElements([current, next]), // overwrite report location
								});
							} else {
								context.report({
									message,
									...reportElements([current, next]),
								});
							}
						}
					}
				},
			});
		});
	},
} as CleanRegexRule;
