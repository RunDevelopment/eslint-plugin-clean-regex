/**
 * @fileoverview Rule to disallow useless flags for regular expressions
 * @author Michael Schmidt
 */
"use strict";

const { RegExpParser, visitRegExpAST } = require("regexpp");
const { createRuleListener, reportFlags } = require("../rules-util");


/**
 * @typedef IsUselessDeterminer
 * @type {(isUselessSetter: (value: boolean) => void) => import("regexpp/visitor").RegExpVisitor.Handlers}
 */

/** @type {Object<string, IsUselessDeterminer>} */
const determiner = {
	iFlag(setUseless) {
		return {
			onCharacterEnter(node) {
				const value = String.fromCodePoint(node.value);
				if (value.toLowerCase() !== value.toUpperCase()) {
					setUseless(false);
				}
			}
		};
	},
	mFlag(setUseless) {
		return {
			onAssertionEnter(node) {
				if (node.kind === "start" || node.kind === "end") {
					setUseless(false);
				}
			}
		};
	},
	sFlag(setUseless) {
		return {
			onCharacterSetEnter(node) {
				if (node.kind === "any") {
					setUseless(false);
				}
			}
		};
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

		const parser = new RegExpParser();

		return createRuleListener({
			RegexLiteral(node) {
				const { pattern, flags } = node.regex;

				if (!flags.includes("i") && !flags.includes("m") && !flags.includes("s")) {
					return; // nothing to check
				}

				let ast;
				try {
					ast = parser.parsePattern(pattern, undefined, undefined, flags.includes("u"));
				} catch (error) {
					return; // ignore invalid patterns no-invalid-regex will handle this for us.
				}

				function checkFlag(flag, reason) {
					if (!flags.includes(flag)) {
						return;
					}
					if (context.options && context.options[0] && context.options[0].ignore &&
						context.options[0].ignore.includes(flag)) {
						return;
					}

					let isUseless = true;
					visitRegExpAST(ast, determiner[`${flag}Flag`](value => { isUseless = value; }));

					if (isUseless) {
						context.report({
							message: `Useless flag: ${flag}: The pattern ${reason}.`,
							...reportFlags(node, flags.replace(RegExp(flag, "g"), ""))
						});
					}
				}

				checkFlag("i", "does not contain case-variant characters");
				checkFlag("m", "does not contain start (^) or end ($) assertions");
				checkFlag("s", "does not contain dots (.)");
			}
		});
	}
};
