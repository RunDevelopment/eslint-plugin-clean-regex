"use strict";

const { testRule } = require("../../test-util");

const errors = [{ message: /[\s\S]+/ }];

testRule(__filename, undefined, {
	valid: [
		String(/\w+\d{4}/),
		String(/\w+a/),
		String(/\w{3,5}\d{2,4}/),
		String(/\w{3,5}\d*/),
		String(/a+b+c+d+[abc]+/),
	],
	invalid: [
		{ code: String(/a\d*\d*a/), output: String(/a\d*a/), errors },
		{ code: String(/\w+\d+/), output: String(/\w+\d/), errors },
		{ code: String(/\w+\d?/), output: String(/\w+/), errors },
		{ code: String(/a+\w+/), output: String(/a\w+/), errors },
		{ code: String(/\w+\d*/), output: String(/\w+/), errors },
		{ code: String(/(\d*\w+)/), output: String(/(\w+)/), errors },
		{ code: String(/;+.*/), output: String(/;.*/), errors },
		{ code: String(/a+(?:a|bb)+/), output: String(/a(?:a|bb)+/), errors },
		{ code: String(/\w+(?:a|b)+/), output: String(/\w+(?:a|b)/), errors },
		{ code: String(/\w+(?:(a)|b)*/), output: String(/\w+(?:(a)|b){0}/), errors },
		{ code: String(/\d{3,5}\w*/), output: String(/\d{3}\w*/), errors },
	]
});
