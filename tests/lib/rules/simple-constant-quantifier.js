"use strict";

const { testRule } = require("../../test-util");

const errors = [{ message: /./ }];

testRule(__filename, undefined, {
	valid: [
		String(/a?/),
		String(/a+/),
		String(/a{1}/),
		String(/a{2,}/),
		String(/a{0,2}/),

		// not handled by this rule
		String(/a{0,0}/),
		String(/a{1,1}/),
	],
	invalid: [
		{ code: String(/a{2,2}/), output: String(/a{2}/), errors },
		{ code: String(/a{100,100}?/), output: String(/a{100}?/), errors },
	]
});
