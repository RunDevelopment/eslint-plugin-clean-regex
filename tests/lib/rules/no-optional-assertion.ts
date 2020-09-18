import { testRule } from "../../test-util";

const errors = [{ message: /[\s\S]+/ }];

testRule(__filename, undefined, {
	valid: [
		String(/fo(?:o\b)?/),
		String(/(?:a|(\b|-){2})?/),
		String(/(?:a|(?:\b|a)+)?/),
	],
	invalid: [
		{ code: String(/(?:\b|(?=a))?/), errors: [{ message: /./ }, { message: /./ }] },
		{ code: String(/(?:\b|a)?/), errors },
		{ code: String(/(?:^|a)*/), errors },
		{ code: String(/(?:((?:(\b|a)))|b)?/), errors },
		{ code: String(/(?:((?:(\b|a)))|b)*/), errors },
	]
});
