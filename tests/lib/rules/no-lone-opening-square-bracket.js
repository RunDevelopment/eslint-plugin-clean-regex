"use strict";

const { testRule } = require("../../test-util");

const errors = [{ message: /[\s\S]*/ }];

testRule(__filename, undefined, {
	valid: [
		String(/ab[c]/),
		String(/ab\[c]/),
	],
	invalid: [
		{ code: String(/[[]/), output: String(/[\[]/), errors },
		{ code: String(/[[-[]/), output: String(/[\[-\[]/), errors: [{ message: /[\s\S]*/ }, { message: /[\s\S]*/ }] },
	]
});
