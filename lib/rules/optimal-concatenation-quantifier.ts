import { CharSet } from "refa";
import {
	CapturingGroup,
	Character,
	CharacterClass,
	CharacterSet,
	Element,
	Flags,
	Group,
	QuantifiableElement,
} from "regexpp/ast";
import { mention, shorten } from "../format";
import { CleanRegexRule, createRuleListener, getDocUrl } from "../rules-util";
import { hasCapturingGroup, hasSomeDescendant, Quant, quantAdd, quantToString } from "../ast-util";
import { emptyCharSet, toCharSet } from "../char-util";

interface Chars {
	readonly chars: CharSet;
	readonly complete: boolean;
}

const EMPTY_UTF16: Chars = {
	chars: emptyCharSet({}),
	complete: false,
};
const EMPTY_UNICODE: Chars = {
	chars: emptyCharSet({ unicode: true }),
	complete: false,
};

function createChars(element: Element, flags: Flags): Chars {
	function empty(): Chars {
		return flags.unicode ? EMPTY_UNICODE : EMPTY_UTF16;
	}

	switch (element.type) {
		case "Character":
		case "CharacterSet":
			return {
				chars: toCharSet(element, flags),
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

function quantize(element: QuantifiableElement, quant: Quant): string {
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
	return element.raw + quantToString(quant);
}

function short(str: string): string {
	return shorten(str, 20, "center");
}

function isGroupOrCharacter(
	element: Element
): element is Group | CapturingGroup | Character | CharacterClass | CharacterSet {
	switch (element.type) {
		case "Group":
		case "CapturingGroup":
		case "Character":
		case "CharacterClass":
		case "CharacterSet":
			return true;
		default:
			return false;
	}
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
		next.greedy === current.greedy &&
		(current.max === Infinity || next.max === Infinity)
	) {
		const currChars = createChars(current.element, flags);
		const nextChars = createChars(next.element, flags);
		const greedy = current.greedy;

		let currQuant: Readonly<Quant>, nextQuant: Readonly<Quant>;
		if (next.max === Infinity && currChars.complete && nextChars.chars.isSupersetOf(currChars.chars)) {
			// currChars is a subset of nextChars
			currQuant = {
				min: current.min,
				max: current.min,
				greedy,
			};
			nextQuant = next; // unchanged
		} else if (current.max === Infinity && nextChars.complete && currChars.chars.isSupersetOf(nextChars.chars)) {
			// nextChars is a subset of currChars
			currQuant = current; // unchanged
			nextQuant = {
				min: next.min,
				max: next.min,
				greedy,
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
	} else if (current.type === "Quantifier" && isGroupOrCharacter(next)) {
		const currChars = createChars(current.element, flags);
		const nextChars = createChars(next, flags);

		if (currChars.complete && nextChars.complete && currChars.chars.equals(nextChars.chars)) {
			const raw = current.element.raw + quantToString(quantAdd(current, 1));
			return {
				message: `${short(mention(next))} can be combined with ${short(mention(current))}.`,
				raw,
			};
		} else {
			return null;
		}
	} else if (isGroupOrCharacter(current) && next.type === "Quantifier") {
		const currChars = createChars(current, flags);
		const nextChars = createChars(next.element, flags);

		if (next.min === 0 && next.max === 1) {
			// The pattern /aa?/ is extremely common and the replacement /a{1,2}/ is a lot less readable.
			return null;
		}

		if (currChars.complete && nextChars.complete && currChars.chars.equals(nextChars.chars)) {
			const raw = next.element.raw + quantToString(quantAdd(next, 1));
			return {
				message: `${short(mention(current))} can be combined with ${short(mention(next))}.`,
				raw,
			};
		} else {
			return null;
		}
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
							let message =
								`The quantifiers of ${mention(short(current.raw))} and ${mention(
									short(next.raw)
								)} are not optimal. ` + replacement.message;

							const involvesCapturingGroup = hasCapturingGroup(current) || hasCapturingGroup(next);

							if (fixable && !involvesCapturingGroup) {
								const before = node.raw.substr(0, current.start - node.start);
								const after = node.raw.substr(next.end - node.start, node.end - next.end);

								context.report({
									message,
									...replaceElement(node, before + replacement.raw + after),
									...reportElements([current, next]), // overwrite report location
								});
							} else {
								if (involvesCapturingGroup) {
									message +=
										" This cannot be fixed automatically because it might change a capturing group.";
								}

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
