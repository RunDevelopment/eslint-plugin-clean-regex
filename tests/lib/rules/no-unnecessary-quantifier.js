"use strict";

const { testRule } = require("../../test-util");

testRule(__filename, undefined, {
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
		{ code: String(/(?:\b){0}/), output: String(/(?:)/), errors: [{ message: "The quantifier and the quantified element can be removed." }] },
	]
});
