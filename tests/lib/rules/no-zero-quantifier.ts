import { testRule } from "../../test-util";

const errors = [{ message: /[\s\S]+/ }];

testRule(__filename, undefined, {
	valid: [
		String(/a{0,1}/),
		String(/a{0,}/),
	],
	invalid: [
		{ code: String(/a{0}/), output: String(/(?:)/), errors },
		{ code: String(/a{0}b/), output: String(/b/), errors },
		{ code: String(/a{0}|b/), output: String(/|b/), errors },
		{ code: String(/a{0,0}/), output: String(/(?:)/), errors },
		{ code: String(/(?:a|b){0,0}/), output: String(/(?:)/), errors },
		{ code: String(/(?:a+){0}/), output: String(/(?:)/), errors},
		{ code: String(/(?:\b){0}/), output: String(/(?:)/), errors},

		// keep capturing groups
		{ code: String(/(a){0}/), output: String(/(a){0}/), errors},
		{ code: String(/(?:a()){0}/), output: String(/(?:a()){0}/), errors},
	]
});
