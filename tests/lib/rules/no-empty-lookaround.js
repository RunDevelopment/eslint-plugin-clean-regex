"use strict";

const { testRule } = require("../../test-util");

const errors = [{ message: /^The (?:lookahead|lookbehind) [\s\S]+ should not match the empty string as this will cause it to always match.$/ }];

testRule(__filename, undefined, {
	valid: [
		String(/(?=foo)/),
		String(/(?!foo)/),
		String(/(?<=foo)/),
		String(/(?<!foo)/),

		String(/(?=(?=.).*)/),
		String(/(?=$|a)/),
		String(/(?=\ba*\b)/),
	],
	invalid: [
		{ code: String(/(?=)/), errors },
		{ code: String(/(?=a*)/), errors },
		{ code: String(/(?=a|b*)/), errors },
	]
});
