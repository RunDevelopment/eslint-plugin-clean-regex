"use strict";

const { testRule } = require("../../test-util");

const errors = [{ message: /./ }];

testRule(__filename, undefined, {
	valid: [
		String(/(?:a|b)/),
		String(/(?:a|b|c\b)/),
		String(/(?:[ab]|c\b)/),
		String(/(?:[ab]|c\b)/),
		String(/(?:[ab]|cd)/),
		String(/(?:[ab]|(c))/),
		String(/(?:a|bb|b|c)/),
	],
	invalid: [
		{ code: String(/a|b|c/), output: String(/[abc]/), errors },
		{ code: String(/(?:a|b|c)/), output: String(/[abc]/), errors },
		{ code: String(/(a|b|c)/), output: String(/([abc])/), errors },
		{ code: String(/(?<name>a|b|c)/), output: String(/(?<name>[abc])/), errors },
		{ code: String(/(?:a|b|c|d\b)/), output: String(/(?:[abc]|d\b)/), errors },
		{ code: String(/(?:a|b\b|[c]|d)/), output: String(/(?:a|b\b|[cd])/), errors },
		{ code: String(/(?:a|\w|\s|["'])/), output: String(/[a\w\s"']/), errors },
		{ code: String(/(?:[a]|b)/), output: String(/[ab]/), errors },
		{ code: String(/(?:[^\s]|b)/), output: String(/[\Sb]/), errors },
		{ code: String(/(?:\w|-|\+|\*|\/)+/), output: String(/[\w\-\+\*\/]+/), errors },
	]
});
