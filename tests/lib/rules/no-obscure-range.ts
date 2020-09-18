import { testRule } from "../../test-util";

const errors = [{ message: /[\s\S]+/ }];

testRule(__filename, undefined, {
	valid: [
		String(/[a-z f-j 2-8 0-9 \0-\x1F \x10-\uFFFF \2-\5 \012-\123 \cA-\cZ]/),
	],
	invalid: [
		{ code: String(/[\1-\x13]/), errors},
		{ code: String(/[\x20-\113]/), errors},

		{ code: String(/[\n-\r]/), errors},

		{ code: String(/[\cA-Z]/), errors},

		{ code: String(/[A-z]/), errors},
		{ code: String(/[0-A]/), errors},
		{ code: String(/[Z-a]/), errors},

		{ code: String(/[+-/*]/), errors},
	]
});
