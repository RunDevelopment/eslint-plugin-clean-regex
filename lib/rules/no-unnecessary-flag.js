"use strict";

const { visitRegExpAST } = require("regexpp");
const { createRuleListener, getDocUrl } = require("../rules-util");


/**
 * @typedef {import("regexpp/ast").Pattern} Pattern
 */

/** @type {Object<string, (pattern: Pattern) => boolean>} */
const determiner = {
	iFlag(pattern) {
		let unnecessary = true;

		visitRegExpAST(pattern, {
			onCharacterEnter(node) {
				const value = String.fromCodePoint(node.value);
				if (value.toLowerCase() !== value.toUpperCase()) {
					unnecessary = false;
				}
			}
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
			}
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
			}
		});

		return unnecessary;
	},
};

/** @type {import("eslint").Rule.RuleModule} */
module.exports = {
	meta: {
		type: "problem",
		docs: {
			description: "Disallow unnecessary regex flags.",
			category: "Possible Errors",
			url: getDocUrl(__filename)
		},
		fixable: "code",
		schema: [
			{
				"type": "object",
				"properties": {
					"ignore": {
						"type": "array",
						"items": {
							"type": "string",
							"enum": ["i", "m", "s"]
						},
						"uniqueItems": true
					}
				},
				"additionalProperties": false
			}
		]
	},

	create(context) {
		return createRuleListener(({ pattern, flags, replaceFlags }) => {

			/** @type {[string, string][]} */
			const unnecessaryFlags = [];

			/**
			 * @param {string} flag
			 * @param {string} reason
			 */
			function checkFlag(flag, reason) {
				if (!flags.raw.includes(flag)) {
					return;
				}
				if (context.options && context.options[0] && context.options[0].ignore &&
					context.options[0].ignore.includes(flag)) {
					return;
				}

				let isUnnecessary = determiner[`${flag}Flag`](pattern);

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
					...replaceFlags(newFlags)
				});
			} else if (unnecessaryFlags.length > 1) {
				const uflags = unnecessaryFlags.map(x => x[0]).join("");
				const newFlags = flags.raw.replace(RegExp(`[${uflags}]`, "g"), "");

				context.report({
					message: `The flags ${uflags} are unnecessary because the pattern ${unnecessaryFlags.map(x => `[${x[0]}] ${x[1]}`).join(", ")}`,
					...replaceFlags(newFlags)
				});
			}

		});
	}
};
