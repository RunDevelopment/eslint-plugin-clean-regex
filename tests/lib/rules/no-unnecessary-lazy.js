"use strict";

const { testRule } = require("../../test-util");

const errors = [{ message: /[\s\S]*/ }];

testRule(__filename, undefined, {
	valid: [
		String(/a+?b+/),
		String(/a??a?/),
	],
	invalid: [
		{ code: String(/a{3}?/), output: String(/a{3}/), errors },
		{ code: String(/a{3,3}?/), output: String(/a{3,3}/), errors },
		{ code: String(/a{0}?/), output: String(/a{0}/), errors },
	]
});
