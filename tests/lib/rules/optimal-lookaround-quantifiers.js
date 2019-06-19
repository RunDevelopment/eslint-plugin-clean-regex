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

const errors = [{ message: /^The quantified expression [\s\S]+ at the end of the expression tree should only be matched a constant number of times. The expression can be [\s\S]+ without affecting the lookaround.$/ }];

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
