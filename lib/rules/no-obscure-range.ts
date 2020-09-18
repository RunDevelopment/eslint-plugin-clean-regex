import { CharRange } from "refa";
import { CleanRegexRule, createRuleListener, getDocUrl } from "../rules-util";
import { isControlEscapeSequence, isHexadecimalEscapeSequence, isOctalEscapeSequence } from "../util";

const allowedRanges: readonly CharRange[] = [
	// digits 0-9
	{ min: "0".charCodeAt(0), max: "9".charCodeAt(0) },
	// Latin A-Z
	{ min: "A".charCodeAt(0), max: "Z".charCodeAt(0) },
	// Latin a-z
	{ min: "a".charCodeAt(0), max: "z".charCodeAt(0) },
];

function inRange(char: number, range: CharRange): boolean {
	return range.min <= char && char <= range.max;
}

export default {
	meta: {
		type: "problem",
		docs: {
			description: "Disallow obscure ranges in character classes.",
			url: getDocUrl(/* #GENERATED */ "no-obscure-range"),
		},
	},

	create(context) {
		return createRuleListener(({ visitAST, reportElement }) => {
			visitAST({
				onCharacterClassRangeEnter(node) {
					const { min, max } = node;

					if (min.value == max.value) {
						// we don't deal with that
						return;
					}

					if (isControlEscapeSequence(min) && isControlEscapeSequence(max)) {
						// both min and max are control escapes
						return;
					}
					if (isOctalEscapeSequence(min) && isOctalEscapeSequence(max)) {
						// both min and max are either octal
						return;
					}
					if ((isHexadecimalEscapeSequence(min) || min.value === 0) && isHexadecimalEscapeSequence(max)) {
						// both min and max are hexadecimal (with a small exception for \0)
						return;
					}

					if (allowedRanges.some(r => inRange(min.value, r) && inRange(max.value, r))) {
						return;
					}

					context.report({
						message: `It's not obvious what characters are matched by ${node.raw}`,
						...reportElement(node),
					});
				},
			});
		});
	},
} as CleanRegexRule;
