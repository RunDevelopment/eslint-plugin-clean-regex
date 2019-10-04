"use strict";

const { testRule } = require("../../test-util");

const errors = [{ message: /[\s\S]+/ }];

testRule(__filename, undefined, {
	valid: [
		String(/\0/),
		String(/()\1/),
		String(/\r\n\x05\u0005/),
		String(/[\1\2-\3]/),
	],
	invalid: [
		{ code: String(/\1/), errors },
		{ code: String(/((?:))\1\2/), errors },
	]
});
