/**
 * @fileoverview Rule to disallow useless flags for regular expressions
 * @author Michael Schmidt
 */
"use strict";

const { visitRegExpAST } = require("regexpp");
const { createRuleListener } = require("../rules-util");


/**
 * @typedef {import("regexpp/ast").Pattern} Pattern
 */

/** @type {Object<string, (pattern: Pattern) => boolean>} */
const determiner = {
	iFlag(pattern) {
		let useless = true;

		visitRegExpAST(pattern, {
			onCharacterEnter(node) {
				const value = String.fromCodePoint(node.value);
				if (value.toLowerCase() !== value.toUpperCase()) {
					useless = false;
				}
			}
		});

		return useless;
	},
	mFlag(pattern) {
		let useless = true;

		visitRegExpAST(pattern, {
			onAssertionEnter(node) {
				if (node.kind === "start" || node.kind === "end") {
					useless = false;
				}
			}
		});

		return useless;
	},
	sFlag(pattern) {
		let useless = true;

		visitRegExpAST(pattern, {
			onCharacterSetEnter(node) {
				if (node.kind === "any") {
					useless = false;
				}
			}
		});

		return useless;
	},
};

/** @type {import("eslint").Rule.RuleModule} */
module.exports = {
	meta: {
		type: "problem",

		docs: {
			description: "disallow useless regex flags",
			category: "Possible Errors",
			recommended: true,
			url: "https://eslint.org/docs/rules/no-extra-semi"
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

			function checkFlag(flag, reason) {
				if (!flags.raw.includes(flag)) {
					return;
				}
				if (context.options && context.options[0] && context.options[0].ignore &&
					context.options[0].ignore.includes(flag)) {
					return;
				}

				let isUseless = determiner[`${flag}Flag`](pattern);

				if (isUseless) {
					context.report({
						message: `Useless flag: ${flag}: The pattern ${reason}.`,
						...replaceFlags(flags.raw.replace(RegExp(flag, "g"), ""))
					});
				}
			}

			checkFlag("i", "does not contain case-variant characters");
			checkFlag("m", "does not contain start (^) or end ($) assertions");
			checkFlag("s", "does not contain dots (.)");

		});
	}
};
