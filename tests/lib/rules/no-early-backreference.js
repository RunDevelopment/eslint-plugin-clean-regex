"use strict";

const { testRule } = require("../../test-util");

const errors = [{ message: "The backreference will always be replaced with an empty string because it appears before the referenced capturing group ends." }];

testRule(__filename, undefined, {
	valid: [
		String(/(a)\1/),
		String(/(?<foo>\w)\k<foo>/),
	],
	invalid: [
		{ code: String(/(a\1)+/), errors },
		{ code: String(/(a(?=\1))/), errors },
		{ code: String(/(?<foo>a\k<foo>)/), errors },
		{ code: String(/\1(a)/), errors },
	]
});
