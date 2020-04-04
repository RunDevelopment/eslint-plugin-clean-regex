"use strict";

const { testRule } = require("../../test-util");

const errors = [{ message: /./ }];

testRule(__filename, undefined, {
	valid: [
		String(/()\1/),
		String(/(a*)(?:a|\1)/),
		String(/(a)+\1/),
		String(/(?=(a))\1/),

		// done by no-empty-backreference
		String(/(a+)b|\1/),
	],
	invalid: [
		{ code: String(/(a)?\1/), errors },
		{ code: String(/(a)*\1/), errors },
		{ code: String(/(?:(a)|b)\1/), errors },
		{ code: String(/(?:(a)|b)+\1/), errors },
	]
});
