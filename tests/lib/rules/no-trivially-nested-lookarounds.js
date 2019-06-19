/**
 * @fileoverview Disallow trivially nested lookarounds
 * @author Michael Schmidt
 */

"use strict";

//------------------------------------------------------------------------------
// Requirements
//------------------------------------------------------------------------------

const rule = require("../../../lib/rules/no-trivially-nested-lookaround");
const { RuleTester } = require("eslint");

const ruleTester = new RuleTester({ parserOptions: { ecmaVersion: 2018 } });

const errors = [{ message: /^The outer (?:lookahead|lookbehind) is unnecessary.$/ }];

ruleTester.run("no-trivially-nested-lookaround", rule, {
	valid: [
		String(/(?=(?=a)b)/),

		// these anchors cannot be negated, so they have to be allowed
		String(/(?!$)/),
		String(/(?<!$)/),
		String(/(?!^)/),
		String(/(?<!^)/),
	],
	invalid: [
		{ code: String(/(?=$)/), output: String(/$/), errors },
		{ code: String(/(?=^)/), output: String(/^/), errors },
		{ code: String(/(?<=$)/), output: String(/$/), errors },
		{ code: String(/(?<=^)/), output: String(/^/), errors },
		{ code: String(/(?=\b)/), output: String(/\b/), errors },
		{ code: String(/(?!\b)/), output: String(/\B/), errors },
		{ code: String(/(?<=\b)/), output: String(/\b/), errors },
		{ code: String(/(?<!\b)/), output: String(/\B/), errors },

		// all trivially nested lookarounds can be written as one lookaround
		// Note: The inner lookaround has to be negated if the outer one is negative.
		{ code: String(/(?=(?=a))/), output: String(/(?=a)/), errors },
		{ code: String(/(?=(?!a))/), output: String(/(?!a)/), errors },
		{ code: String(/(?=(?<=a))/), output: String(/(?<=a)/), errors },
		{ code: String(/(?=(?<!a))/), output: String(/(?<!a)/), errors },
		{ code: String(/(?!(?=a))/), output: String(/(?!a)/), errors },
		{ code: String(/(?!(?!a))/), output: String(/(?=a)/), errors },
		{ code: String(/(?!(?<=a))/), output: String(/(?<!a)/), errors },
		{ code: String(/(?!(?<!a))/), output: String(/(?<=a)/), errors },
		{ code: String(/(?<=(?=a))/), output: String(/(?=a)/), errors },
		{ code: String(/(?<=(?!a))/), output: String(/(?!a)/), errors },
		{ code: String(/(?<=(?<=a))/), output: String(/(?<=a)/), errors },
		{ code: String(/(?<=(?<!a))/), output: String(/(?<!a)/), errors },
		{ code: String(/(?<!(?=a))/), output: String(/(?!a)/), errors },
		{ code: String(/(?<!(?!a))/), output: String(/(?=a)/), errors },
		{ code: String(/(?<!(?<=a))/), output: String(/(?<!a)/), errors },
		{ code: String(/(?<!(?<!a))/), output: String(/(?<=a)/), errors },
	]
});
