import { testRule } from "../../test-util";

testRule(__filename, undefined, {
	valid: [
		String(/\w+\d{4}/),
		String(/\w+a/),
		String(/\w{3,5}\d{2,4}/),
		String(/\w{3,5}\d*/),
		String(/a+b+c+d+[abc]+/),
		String(/(?:a|::)?\w+/),
	],
	invalid: [
		{ code: String(/a\d*\d*a/), output: String(/a\d*a/), errors: 1 },
		{ code: String(/\w+\d+/), output: String(/\w+\d/), errors: 1 },
		{ code: String(/\w+\d?/), output: String(/\w+/), errors: 1 },
		{ code: String(/a+\w+/), output: String(/a\w+/), errors: 1 },
		{ code: String(/\w+\d*/), output: String(/\w+/), errors: 1 },
		{ code: String(/(\d*\w+)/), output: String(/(\w+)/), errors: 1 },
		{ code: String(/;+.*/), output: String(/;.*/), errors: 1 },
		{ code: String(/a+(?:a|bb)+/), output: String(/a(?:a|bb)+/), errors: 1 },
		{ code: String(/\w+(?:a|b)+/), output: String(/\w+(?:a|b)/), errors: 1 },
		{ code: String(/\w+(?:(a)|b)*/), output: String(/\w+(?:(a)|b){0}/), errors: 1 },
		{ code: String(/\d{3,5}\w*/), output: String(/\d{3}\w*/), errors: 1 },

		{
			code: String(/\w+\d*/),
			output: String(/\w+\d*/),
			options: [{ fixable: false }],
			errors: 1
		},
	]
});
