/**
 * @fileoverview Disallow useless flags for regular expressions
 * @author Michael Schmidt
 */

"use strict";

//------------------------------------------------------------------------------
// Requirements
//------------------------------------------------------------------------------

const rule = require("../../../lib/rules/no-useless-flags");
const { RuleTester } = require("eslint");

const ruleTester = new RuleTester({ parserOptions: { ecmaVersion: 2018 } });

ruleTester.run("no-useless-flags", rule, {
	valid: [
		// i
		String(/foo/i),
		String(/BAR/i),
		String(/\x41/i),
		String(/[a-zA-Z]/i), // in that case you should use the i flag instead of removing it

		// m
		String(/^foo/m),
		String(/foo$/m),
		String(/^foo$/m),

		// s
		String(/./s),

		// ignore
		{ code: String(/\w/i), options: [{ ignore: ["i"] }] },
		{ code: String(/\w/m), options: [{ ignore: ["m"] }] },
		{ code: String(/\w/s), options: [{ ignore: ["s"] }] },
	],
	invalid: [
		// i
		{ code: String(/\w/i), output: String(/\w/), errors: [{ message: /^Useless flag: i:/ }] },

		// m
		{ code: String(/\w/m), output: String(/\w/), errors: [{ message: /^Useless flag: m:/ }] },

		// s
		{ code: String(/\w/s), output: String(/\w/), errors: [{ message: /^Useless flag: s:/ }] },

		// all flags
		{
			code: String(/\w/ims),
			output: String(/\w/),
			errors: [
				{ message: "Useless flags: ims: [i] The pattern does not contain case-variant characters. [m] The pattern does not contain start (^) or end ($) assertions. [s] The pattern does not contain dots (.)." },
			]
		},
	]
});
