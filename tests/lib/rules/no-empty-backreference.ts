import { testRule } from "../../test-util";

const zeroLength = [{ message: "The referenced capturing group can only match the empty string." }];
const notReachable = [{ message: "The backreference is not reachable from the referenced capturing group without resetting the captured string." }];

testRule(__filename, undefined, {
	valid: [
		String(/(a)\1/),
		String(/(a)(b|\1)/),
		String(/(a)?(b|\1)?/),
		String(/(?=(.+))\1/),
		String(/(?<foo>\w)\k<foo>/),

		// right-to-left matching
		String(/\w+(?<=a\1a(b))/),
	],
	invalid: [
		// zero-length group
		{ code: String(/()\1/), errors: zeroLength },
		{ code: String(/(\b)\1/), errors: zeroLength },
		{ code: String(/(\b|(?=123))\1/), errors: zeroLength },

		// not reachable
		{ code: String(/(a\1)+/), errors: notReachable },
		{ code: String(/(a(?=\1))/), errors: notReachable },
		{ code: String(/(?<foo>a\k<foo>)/), errors: notReachable },
		{ code: String(/\1(a)/), errors: notReachable },

		{ code: String(/(a)|\1/), errors: notReachable },
		{ code: String(/(?:(a)|\1)b/), errors: notReachable },

		// right-to-left matching
		{ code: String(/(?<=(a)\1)/), errors: notReachable },
	]
});
