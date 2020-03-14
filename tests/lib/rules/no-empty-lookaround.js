"use strict";

const { testRule } = require("../../test-util");

const errors = [{ message: /^The (?:lookahead|lookbehind) [\s\S]+ is non-functional as it matches the empty string. It will always trivially (?:accept|reject).$/ }];

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

		{ code: String(/(?!)/), errors },
		{ code: String(/(?!a*)/), errors },
		{ code: String(/(?!a|b*)/), errors },
	]
});
