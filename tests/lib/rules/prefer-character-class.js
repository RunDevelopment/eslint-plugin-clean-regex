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
		{ code: String(/]|a|b/), output: String(/[\]ab]/), errors },
		{ code: String(/a|-|c/), output: String(/[a\-c]/), errors },
		{ code: String(/a|[-]|c/), output: String(/[a\-c]/), errors },
		{ code: String(/[a^]|c/), output: String(/[a^c]/), errors },
		{ code: String(/(?:a|b|c)/), output: String(/[abc]/), errors },
		{ code: String(/(a|b|c)/), output: String(/([abc])/), errors },
		{ code: String(/(?<name>a|b|c)/), output: String(/(?<name>[abc])/), errors },
		{ code: String(/(?:a|b|c|d\b)/), output: String(/(?:[abc]|d\b)/), errors },
		{ code: String(/(?:a|b\b|[c]|d)/), output: String(/(?:a|b\b|[cd])/), errors },
		{ code: String(/(?:a|\w|\s|["'])/), output: String(/[a\w\s"']/), errors },
		{ code: String(/(?:[a]|b)/), output: String(/[ab]/), errors },
		{ code: String(/(?:[^\s]|b)/), output: String(/[\Sb]/), errors },
		{ code: String(/(?:\w|-|\+|\*|\/)+/), output: String(/[\w\-\+\*\/]+/), errors },

		// always do non-disjoint
		{ code: String(/(?:a|\w|b\b)/), output: String(/(?:[a\w]|b\b)/), errors },

		// always do match all
		{ code: String(/(?:\s|\S|b\b)/), output: String(/(?:[\s\S]|b\b)/), errors },
		{ code: String(/(?:\w|\D|b\b)/), output: String(/(?:[\w\D]|b\b)/), errors },
		{ code: String(/(?:\w|\W|b\b)/), output: String(/(?:[\w\W]|b\b)/), errors },
	]
});
