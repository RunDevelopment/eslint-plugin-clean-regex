/**
 * @fileoverview Disallow suboptimal quantifiers inside lookarounds
 * @author Michael Schmidt
 */

"use strict";

//------------------------------------------------------------------------------
// Requirements
//------------------------------------------------------------------------------

const rule = require("../../../lib/rules/optimal-lookaround-quantifiers");
const { RuleTester } = require("eslint");

const ruleTester = new RuleTester({ parserOptions: { ecmaVersion: 2018 } });

const errors = [{ message: /^Suboptimal lookaround:/ }];

ruleTester.run("optimal-lookaround-quantifiers", rule, {
	valid: [
		String(/(?=(a*))\w+\1/),
		String(/(?<=a{4})/)
	],
	invalid: [
		{ code: String(/(?=ba*)/), errors },
		{ code: String(/(?=(?:a|b|abc*))/), errors },
		{ code: String(/(?<=(?:a|(?:a|(?:abc*|))))/), errors },
		{ code: String(/(?<=[a-c]*)/), errors },
		{ code: String(/(?=ab(c)*)/), errors },
	]
});
