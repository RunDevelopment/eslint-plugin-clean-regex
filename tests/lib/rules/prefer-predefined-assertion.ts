import { testRule } from "../../test-util";

testRule(__filename, undefined, {
	valid: [
		String(/a(?=\W)/),
	],
	invalid: [
		{ code: String(/a(?=\w)/), output: String(/a\B/), errors: 1 },
		{ code: String(/a(?!\w)/), output: String(/a\b/), errors: 1 },
		{ code: String(/(?<=\w)a/), output: String(/\Ba/), errors: 1 },
		{ code: String(/(?<!\w)a/), output: String(/\ba/), errors: 1 },

		{ code: String(/a(?=\W)./), output: String(/a\b./), errors: 1 },
		{ code: String(/a(?!\W)./), output: String(/a\B./), errors: 1 },
		{ code: String(/.(?<=\W)a/), output: String(/.\ba/), errors: 1 },
		{ code: String(/.(?<!\W)a/), output: String(/.\Ba/), errors: 1 },

		{ code: String(/a+(?!\w)(?:\s|bc+)+/), output: String(/a+\b(?:\s|bc+)+/), errors: 1 },

		{ code: String(/(?!.)(?![^])/), output: String(/(?!.)$/), errors: 1 },
		{ code: String(/(?<!.)(?<![^])/m), output: String(/^(?<![^])/m), errors: 1 },
	]
});
