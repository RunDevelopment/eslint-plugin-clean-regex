"use strict";

const { testRule } = require("../../test-util");

const errors = [{ message: /[\s\S]+/ }];

testRule(__filename, undefined, {
	valid: [
		String(/a+/),
		String(/a?/),
		String(/(a|b?)*/),
		String(/(a?){0,3}/),
	],
	invalid: [
		{ code: String(/(a|b?)?/), errors },

		{ code: String(/(a|\b)+/), errors },
		{ code: String(/(a?){5}/), errors },
	]
});
