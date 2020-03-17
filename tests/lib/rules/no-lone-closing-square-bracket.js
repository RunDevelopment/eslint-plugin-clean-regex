"use strict";

const { testRule } = require("../../test-util");

const errors = [{ message: /[\s\S]*/ }];

testRule(__filename, undefined, {
	valid: [
		String(/ab[c]/),
	],
	invalid: [
		{ code: String(/abc]/), output: String(/abc\]/), errors },
		{ code: String(/foo(?:])/), output: String(/foo(?:\])/),errors },
	]
});
