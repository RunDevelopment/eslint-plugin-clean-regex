/**
 * @fileoverview Disallow constant capturing groups for regular expressions
 * @author Michael Schmidt
 */

"use strict";

//------------------------------------------------------------------------------
// Requirements
//------------------------------------------------------------------------------

const rule = require("../../../lib/rules/no-constant-capturing-groups");
const { RuleTester } = require("eslint");

const ruleTester = new RuleTester({ parserOptions: { ecmaVersion: 2018 } });

ruleTester.run("no-constant-capturing-groups", rule, {
	valid: [
		String(/(a*)/),
		String(/(a{2,3})/),
	],
	invalid: [
		{
			code: String(/()/),
			errors: [{ message: "Empty capturing group" }]
		},
		{
			code: String(/(\b(?:ab){3}$)/),
			errors: [{ message: "Constant capturing group: The capturing group (\\b(?:ab){3}$) can only capture one word." }]
		},
	]
});
