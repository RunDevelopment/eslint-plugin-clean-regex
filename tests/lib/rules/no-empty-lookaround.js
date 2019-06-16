/**
 * @fileoverview Disallow lookarounds which match the empty word
 * @author Michael Schmidt
 */

"use strict";

//------------------------------------------------------------------------------
// Requirements
//------------------------------------------------------------------------------

const rule = require("../../../lib/rules/no-empty-lookaround");
const { RuleTester } = require("eslint");

const ruleTester = new RuleTester({ parserOptions: { ecmaVersion: 2018 } });

ruleTester.run("no-empty-lookaround", rule, {
	valid: [
		String(/(?=foo)/),
		String(/(?!foo)/),
		String(/(?<=foo)/),
		String(/(?<!foo)/),

		String(/(?=(?=.).*)/),
		String(/(?=$|a)/),
		String(/(?=\ba*\b)/),
	],
	invalid: [
		{ code: String(/(?=)/), errors: [{ message: /^Empty lookaround:/ }] },
		{ code: String(/(?=a*)/), errors: [{ message: /^Empty lookaround:/ }] },
		{ code: String(/(?=a|b*)/), errors: [{ message: /^Empty lookaround:/ }] },
	]
});
