/**
 * @fileoverview Sort the flags of regular expressions
 * @author Michael Schmidt
 */

"use strict";

//------------------------------------------------------------------------------
// Requirements
//------------------------------------------------------------------------------

const rule = require("../../../lib/rules/sort-flags");
const { RuleTester } = require("eslint");

const ruleTester = new RuleTester({ parserOptions: { ecmaVersion: 2018 } });

ruleTester.run("sort-flags", rule, {
	valid: [
		String.raw`/\w/i`,
		String.raw`/\w/im`,
		String.raw`/\w/gi`,
		String.raw`/\w/gimsuy`,
		{ code: String.raw`/\w/yusimg`, options: [{ order: "yusimg" }] },
	],
	invalid: [
		{
			code: String.raw`/\w/yusimg`,
			errors: [{ message: "Unsorted flags: The flags should in the order gimsuy." }]
		},
		{
			code: String.raw`/\w/gimsuy`,
			options: [{ order: "yusimg" }],
			errors: [{ message: "Unsorted flags: The flags should in the order yusimg." }]
		},
	]
});
