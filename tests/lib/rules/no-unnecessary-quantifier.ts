import { testRule } from "../../test-util";

testRule(__filename, undefined, {
	valid: [
		String(/a*/),
		String(/(?:a)?/),
		String(/(?:\b|a)?/),
		String(/(?:\b)*/),
		String(/(?:\b|(?!a))*/),
		String(/(?:\b|(?!))*/),
		String(/#[\da-z]+|#(?:-|([+/\\*~<>=@%|&?!])\1?)|#(?=\()/),
	],
	invalid: [
		// trivial
		{ code: String(/a{1}/), output: String(/a/), errors: [{ message: "Unnecessary quantifier." }] },
		{ code: String(/a{1,1}/), output: String(/a/), errors: [{ message: "Unnecessary quantifier." }] },

		// empty quantified element
		{ code: String(/(?:)+/), errors: [{ message: "The quantified element is empty, so the quantifier can be removed." }] },
		{ code: String(/(?:|(?:)){5,9}/), errors: [{ message: "The quantified element is empty, so the quantifier can be removed." }] },
		{ code: String(/(?:|()()())*/), errors: [{ message: "The quantified element is empty, so the quantifier can be removed." }] },

		// unnecessary optional quantifier (?) because the quantified element is potentially empty
		{ code: String(/(?:a+b*|c*)?/), errors: [{ message: "The optional quantifier can be removed because the quantified element can match the empty string." }] },
		{ code: String(/(?:a|b?c?d?e?f?)?/), errors: [{ message: "The optional quantifier can be removed because the quantified element can match the empty string." }] },
		{ code: String(/(?:a|(?=))?/), errors: [{ message: "The optional quantifier can be removed because the quantified element can match the empty string." }] },

		// quantified elements which do not consume characters
		{ code: String(/(?:\b)+/), errors: [{ message: "The quantified element does not consume characters, so the quantifier (minimum > 0) can be removed." }] },
		{ code: String(/(?:\b){5,100}/), errors: [{ message: "The quantified element does not consume characters, so the quantifier (minimum > 0) can be removed." }] },
		{ code: String(/(?:\b|(?!a))+/), errors: [{ message: "The quantified element does not consume characters, so the quantifier (minimum > 0) can be removed." }] },
		{ code: String(/(?:\b|(?!)){6}/), errors: [{ message: "The quantified element does not consume characters, so the quantifier (minimum > 0) can be removed." }] },

	]
});
