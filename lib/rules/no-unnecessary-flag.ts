import { visitRegExpAST } from "regexpp";
import { Pattern } from "regexpp/ast";
import { CleanRegexRule, createRuleListener, getDocUrl } from "../rules-util";

const determiner: Record<string, (pattern: Pattern) => boolean> = {
	iFlag(pattern) {
		let unnecessary = true;

		visitRegExpAST(pattern, {
			onCharacterEnter(node) {
				const value = String.fromCodePoint(node.value);
				if (value.toLowerCase() !== value.toUpperCase()) {
					unnecessary = false;
				}
			},
		});

		return unnecessary;
	},
	mFlag(pattern) {
		let unnecessary = true;

		visitRegExpAST(pattern, {
			onAssertionEnter(node) {
				if (node.kind === "start" || node.kind === "end") {
					unnecessary = false;
				}
			},
		});

		return unnecessary;
	},
	sFlag(pattern) {
		let unnecessary = true;

		visitRegExpAST(pattern, {
			onCharacterSetEnter(node) {
				if (node.kind === "any") {
					unnecessary = false;
				}
			},
		});

		return unnecessary;
	},
};

export default {
	meta: {
		type: "suggestion",
		docs: {
			description: "Disallow unnecessary regex flags.",
			url: getDocUrl(/* #GENERATED */ "no-unnecessary-flag"),
		},
		fixable: "code",
		schema: [
			{
				type: "object",
				properties: {
					ignore: {
						type: "array",
						items: {
							type: "string",
							enum: ["i", "m", "s"],
						},
						uniqueItems: true,
					},
				},
				additionalProperties: false,
			},
		],
	},

	create(context) {
		return createRuleListener(({ pattern, flags, replaceFlags }) => {
			const unnecessaryFlags: [string, string][] = [];

			function checkFlag(flag: string, reason: string): void {
				if (!flags.raw.includes(flag)) {
					return;
				}
				if (
					context.options &&
					context.options[0] &&
					context.options[0].ignore &&
					context.options[0].ignore.includes(flag)
				) {
					return;
				}

				const isUnnecessary = determiner[`${flag}Flag`](pattern);

				if (isUnnecessary) {
					unnecessaryFlags.push([flag, reason]);
				}
			}

			checkFlag("i", "does not contain case-variant characters");
			checkFlag("m", "does not contain start (^) or end ($) assertions");
			checkFlag("s", "does not contain dots (.)");

			if (unnecessaryFlags.length === 1) {
				const [flag, reason] = unnecessaryFlags[0];
				const newFlags = flags.raw.replace(RegExp(flag, "g"), "");

				context.report({
					message: `The ${flag} flags is unnecessary because the pattern ${reason}.`,
					...replaceFlags(newFlags),
				});
			} else if (unnecessaryFlags.length > 1) {
				const uflags = unnecessaryFlags.map(x => x[0]).join("");
				const newFlags = flags.raw.replace(RegExp(`[${uflags}]`, "g"), "");

				context.report({
					message: `The flags ${uflags} are unnecessary because the pattern ${unnecessaryFlags
						.map(x => `[${x[0]}] ${x[1]}`)
						.join(", ")}`,
					...replaceFlags(newFlags),
				});
			}
		});
	},
} as CleanRegexRule;
