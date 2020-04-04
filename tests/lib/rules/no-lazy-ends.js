"use strict";

const { testRule } = require("../../test-util");

testRule(__filename, undefined, {
	valid: [
		String(/a+?b*/),
		String(/a??(?:ba+?|c)*/),
		String(/ba*?$/),

		String(/a{3}?/), // uselessly lazy but that's not for this rule to correct
	],
	invalid: [
		{ code: String(/a??/), errors: [{ message: "The quantifier and the quantified element can be removed because the quantifier is lazy and has a minimum of 0." }] },
		{ code: String(/a*?/), errors: [{ message: "The quantifier and the quantified element can be removed because the quantifier is lazy and has a minimum of 0." }] },
		{ code: String(/a+?/), errors: [{ message: "The quantifier can be removed because the quantifier is lazy and has a minimum of 1." }] },
		{ code: String(/a{3,7}?/), errors: [{ message: "The quantifier can be replaced with '{3}' because the quantifier is lazy and has a minimum of 3." }] },
		{ code: String(/a{3,}?/), errors: [{ message: "The quantifier can be replaced with '{3}' because the quantifier is lazy and has a minimum of 3." }] },

		{ code: String(/(?:a|b(c+?))/), errors: [{ message: "The quantifier can be removed because the quantifier is lazy and has a minimum of 1." }] },
		{ code: String(/a(?:c|ab+?)?/), errors: [{ message: "The quantifier can be removed because the quantifier is lazy and has a minimum of 1." }] },
	]
});
