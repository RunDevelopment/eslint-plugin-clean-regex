import { testRule } from "../../test-util";

const errors = [{ message: /^Use the predefined quantifier [+*?] instead\.$/ }];

testRule(__filename, undefined, {
	valid: [
		String(/a*/),
		String(/a?/),
		String(/a+/),
		String(/a{1}/),
		String(/a{2,}/),
		String(/a{0,2}/),
		String(/catch\s+/),
	],
	invalid: [
		{ code: String(/a{0,1}/), output: String(/a?/), errors },
		{ code: String(/a{0,1}?/), output: String(/a??/), errors },
		{ code: String(/a{0,}/), output: String(/a*/), errors },
		{ code: String(/a{0,}?/), output: String(/a*?/), errors },
		{ code: String(/a{1,}/), output: String(/a+/), errors },
		{ code: String(/a{1,}?/), output: String(/a+?/), errors },
	]
});
