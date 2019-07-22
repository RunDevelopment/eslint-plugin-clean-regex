"use strict";

//------------------------------------------------------------------------------
// Requirements
//------------------------------------------------------------------------------

const rule = require("../../../lib/rules/no-empty-lookaround");
const { RuleTester } = require("eslint");

const ruleTester = new RuleTester({ parserOptions: { ecmaVersion: 2018 } });

const errors = [{ message: /^The (?:lookahead|lookbehind) [\s\S]+ should not match the empty string as this will cause it to always match.$/ }];

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
		{ code: String(/(?=)/), errors },
		{ code: String(/(?=a*)/), errors },
		{ code: String(/(?=a|b*)/), errors },
	]
});
