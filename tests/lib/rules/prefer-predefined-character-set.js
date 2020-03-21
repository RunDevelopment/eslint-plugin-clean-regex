"use strict";

const { testRule } = require("../../test-util");

const errors = [{ message: /./ }];

testRule(__filename, undefined, {
	valid: [
		String(/\w+/),
		String(/[\w]+/),
		String(/[\d]+/),
		String(/./),
		String(/[1-9]/),
		String(/[a-zA-Z\d]/),
		String(/[\S]/),
	],
	invalid: [
		{ code: String(/[0-9]/), output: String(/[\d]/), errors },
		{ code: String(/[1234567890]/), output: String(/[\d]/), errors },
		{ code: String(/[^1234567890]/), output: String(/[^\d]/), errors },
		{ code: String(/[-\da-zA-Z_]/), output: String(/[-\w]/), errors },
		{ code: String(/[\da-z_-]/i), output: String(/[\w-]/i), errors },
		{ code: String(/[-0-9a-zA-Z_]/), output: String(/[-\w]/), errors },
		{ code: String(/[0-9a-z_-]/i), output: String(/[\w-]/i), errors },
		{ code: String(/[0-9a-hd-z_-]/i), output: String(/[\w-]/i), errors },
		{ code: String(/[0-9\D]/), output: String(/[\d\D]/), errors },
	]
});
