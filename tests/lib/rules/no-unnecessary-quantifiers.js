"use strict";

//------------------------------------------------------------------------------
// Requirements
//------------------------------------------------------------------------------

const rule = require("../../../lib/rules/no-unnecessary-quantifiers");
const { RuleTester } = require("eslint");

const ruleTester = new RuleTester({ parserOptions: { ecmaVersion: 2018 } });

ruleTester.run("no-unnecessary-quantifiers", rule, {
	valid: [
		String(/a*/),
		String(/(?:a)?/),
		String(/(?:\b|a)?/),
	],
	invalid: [
		{ code: String(/(?:)+/), output: String(/(?:)/), errors: [{ message: "The quantified element does not consume characters." }] },
		{ code: String(/(?:\b|(?!a))?/), output: String(/(?:\b|(?!a))/), errors: [{ message: "The quantified element does not consume characters." }] },

		{ code: String(/a{1}/), output: String(/a/), errors: [{ message: "The quantifier is unnecessary." }] },
		{ code: String(/a{1,1}/), output: String(/a/), errors: [{ message: "The quantifier is unnecessary." }] },

		{ code: String(/a{0}/), output: String(/(?:)/), errors: [{ message: "The quantifier and the quantified element can be removed." }] },
		{ code: String(/a{0}b/), output: String(/b/), errors: [{ message: "The quantifier and the quantified element can be removed." }] },
		{ code: String(/a{0}|b/), output: String(/|b/), errors: [{ message: "The quantifier and the quantified element can be removed." }] },
		{ code: String(/a{0,0}/), output: String(/(?:)/), errors: [{ message: "The quantifier and the quantified element can be removed." }] },
		{ code: String(/(a|b){0,0}/), output: String(/(?:)/), errors: [{ message: "The quantifier and the quantified element can be removed." }] },
		{ code: String(/(?:a+){0}/), output: String(/(?:)/), errors: [{ message: "The quantifier and the quantified element can be removed." }] },
	]
});
