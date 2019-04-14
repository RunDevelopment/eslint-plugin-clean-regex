/**
 * @fileoverview Disallow regular expressions which do not follow strict syntax
 * @author Michael Schmidt
 */

"use strict";

//------------------------------------------------------------------------------
// Requirements
//------------------------------------------------------------------------------

const rule = require("../../../lib/rules/strict-syntax");
const { RuleTester } = require("eslint");

const ruleTester = new RuleTester({ parserOptions: { ecmaVersion: 2018 } });

ruleTester.run("strict-syntax", rule, {
	valid: [
		String(/abc/),
		String(/\cA/),
		String(/\xFF{3,}/),
		String(/\xFF{3,}/u),
	],
	invalid: [
		{
			code: String(/{/),
			errors: [{ message: "Strict syntax: /{/u: Lone quantifier brackets" }]
		},
		{
			code: String(/}/),
			errors: [{ message: "Strict syntax: /}/u: Lone quantifier brackets" }]
		},
		{
			code: String(/\c1/),
			errors: [{ message: "Strict syntax: /\\c1/u: Invalid escape" }]
		},
		{
			code: String(/\xF{2}/),
			errors: [{ message: "Strict syntax: /\\xF{2}/u: Invalid escape" }]
		},
		{
			code: String(/\u{2,}/),
			errors: [{ message: "Strict syntax: /\\u{2,}/u: Invalid unicode escape" }]
		},
		{
			code: String(/(?=a)?/),
			errors: [{ message: "Strict syntax: /(?=a)?/u: Nothing to repeat" }]
		},
	]
});
