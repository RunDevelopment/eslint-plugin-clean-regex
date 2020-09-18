import { testRule } from "../../test-util";

testRule(__filename, undefined, {
	valid: [
		String(/()|(?:)|(?=)/),
		String(/(?:)/),
		String(/a*|b+/),
	],
	invalid: [
		{ code: String(/|||||/), errors: 1 },
		{ code: String(/(a+|b+|)/), errors: 1 },
		{ code: String(/(?:\|\|||\|)/), errors: 1 },
	]
});
