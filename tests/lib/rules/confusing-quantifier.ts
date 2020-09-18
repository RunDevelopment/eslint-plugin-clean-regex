import { testRule } from "../../test-util";

const errors = [{ message: /[\s\S]+/ }];

testRule(__filename, undefined, {
	valid: [
		String(/a+/),
		String(/a?/),
		String(/(a|b?)*/),
		String(/(a?){0,3}/),
		String(/(a|\b)+/),
	],
	invalid: [
		{ code: String(/(a?){5}/), errors },
		{ code: String(/(?:a?b*|c+){4}/), errors },
	]
});
