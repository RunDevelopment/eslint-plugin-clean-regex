"use strict";

const { testRule } = require("../../test-util");

testRule(__filename, undefined, {
	valid: [
		String(/(a*)/),
		String(/(a{2,3})/),
		String(/(a|b)/),
		String(/(a)/i),
		String(/(a|A)/),
		String(/(a)/),
		{ code: String(/(a)/), options: [{ ignoreNonEmpty: true }] },
	],
	invalid: [
		{ code: String(/()/), errors: [{ message: "Empty capturing group" }] },
		{ code: String(/()/), options: [{ ignoreNonEmpty: false }], errors: [{ message: "Empty capturing group" }] },
		{ code: String(/()/), options: [{ ignoreNonEmpty: true }], errors: [{ message: "Empty capturing group" }] },

		{ code: String(/(\b)/), errors: [{ message: "The capturing group (\\b) can only capture the empty string." }] },
		{ code: String(/(\b)/), options: [{ ignoreNonEmpty: false }], errors: [{ message: "The capturing group (\\b) can only capture the empty string." }] },
		{ code: String(/(\b)/), options: [{ ignoreNonEmpty: true }], errors: [{ message: "The capturing group (\\b) can only capture the empty string." }] },

		{ code: String(/(^\b|(?!b))/), errors: [{ message: "The capturing group (^\\b|(?!b)) can only capture the empty string." }] },

		{ code: String(/(a|a|a)/), options: [{ ignoreNonEmpty: false }], errors: [{ message: "The capturing group (a|a|a) can only capture one word which is \"a\"." }] },

		{ code: String(/(,)/i), options: [{ ignoreNonEmpty: false }], errors: [{ message: "The capturing group (,) can only capture one word which is \",\"." }] },
		{ code: String(/(\b(?:ab){3}$)/), options: [{ ignoreNonEmpty: false }], errors: [{ message: "The capturing group (\\b(?:ab){3}$) can only capture one word which is \"ababab\"." }] },
	]
});
