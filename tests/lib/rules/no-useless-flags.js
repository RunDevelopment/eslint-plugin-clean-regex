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
		{ code: String(/\w/i), errors: [{ message: /^Useless flag: i:/ }] },

		// m
		{ code: String(/\w/m), errors: [{ message: /^Useless flag: m:/ }] },

		// s
		{ code: String(/\w/s), errors: [{ message: /^Useless flag: s:/ }] },

		// all flags
		{
			code: String(/\w/ims),
			errors: [
				{ message: /^Useless flag: i:/ },
				{ message: /^Useless flag: m:/ },
				{ message: /^Useless flag: s:/ },
			]
		},
	]
});
