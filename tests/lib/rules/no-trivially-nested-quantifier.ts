import { testRule } from "../../test-util";

testRule(__filename, undefined, {
	valid: [
		String(/(a?)+/),
		String(/(?:a{2})+/),
		String(/(?:a{3,4})+/),
	],
	invalid: [
		{ code: String(/(?:a?)+/), output: String(/a*/), errors: 1 },
		{ code: String(/(?:a{1,2})*/), output: String(/a*/), errors: 1 },
		{ code: String(/(?:a{1,2})+/), output: String(/a+/), errors: 1 },
		{ code: String(/(?:a{1,2}){3,4}/), output: String(/a{3,8}/), errors: 1 },
		{ code: String(/(?:a{2,}){4}/), output: String(/a{8,}/), errors: 1 },
		{ code: String(/(?:a{4,}){5}/), output: String(/a{20,}/), errors: 1 },
		{ code: String(/(?:a{3}){4}/), output: String(/a{12}/), errors: 1 },
	]
});
