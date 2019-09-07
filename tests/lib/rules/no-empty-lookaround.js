"use strict";

const { testRule } = require("../../test-util");

const errors = [{ message: /^The empty (?:lookahead|lookbehind) [\s\S]+ is non-functional as it matches the empty string.$/ }];

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
