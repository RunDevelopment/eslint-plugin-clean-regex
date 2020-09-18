import { testRule } from "../../test-util";

const errors = [{ message: /[\s\S]+/ }];

testRule(__filename, undefined, {
	valid: [
		String(/a+/),
		String(/[a-f\w\x00-\xFF]/),

		// default config is { mode: "dot-if-dotAll", charClass: "[\\s\\S]" }
		String(/[\s\S]/),
		String(/./s),

		{ code: String(/[\s\S]/), options: [{ mode: "char-class", charClass: "[\\s\\S]" }] },
		{ code: String(/[\d\D]/), options: [{ mode: "char-class", charClass: "[\\d\\D]" }] },
		{ code: String(/[^]/), options: [{ mode: "char-class", charClass: "[^]" }] },

		{ code: String(/[^]/), options: [{ mode: "dot-if-dotAll", charClass: "[^]" }] },
		{ code: String(/./s), options: [{ mode: "dot-if-dotAll", charClass: "[^]" }] },
		{ code: String(/./su), options: [{ mode: "dot-if-dotAll", charClass: "[^]" }] },

		{ code: String(/./s), options: [{ mode: "dot", charClass: "[^]" }] },
		{ code: String(/./su), options: [{ mode: "dot", charClass: "[^]" }] },
	],
	invalid: [
		{ code: String(/[^]/), output: String(/[\s\S]/), errors },
		{ code: String(/[\d\D]/), output: String(/[\s\S]/), errors },
		{ code: String(/[\w\W]/), output: String(/[\s\S]/), errors },
		{ code: String(/[\w\D]/), output: String(/[\s\S]/), errors },
		{ code: String(/[\0-\uFFFF]/), output: String(/[\s\S]/), errors },
		{ code: String(/[\0-\u{10FFFF}]/u), output: String(/[\s\S]/u), errors },

		{
			code: String(/[^]/),
			output: String(/[\s\S]/),
			options: [{ mode: "char-class", charClass: "[\\s\\S]" }],
			errors
		},
		{
			code: String(/[\s\S]/),
			output: String(/[\d\D]/),
			options: [{ mode: "char-class", charClass: "[\\d\\D]" }],
			errors
		},
		{
			code: String(/./s),
			output: String(/[\d\D]/),
			options: [{ mode: "char-class", charClass: "[\\d\\D]" }],
			errors
		},
		{
			code: String(/./msu),
			output: String(/[\d\D]/mu),
			options: [{ mode: "char-class", charClass: "[\\d\\D]" }],
			errors
		},

		{
			code: String(/[\d\D]/),
			output: String(/[^]/),
			options: [{ mode: "dot-if-dotAll", charClass: "[^]" }],
			errors
		},
		{
			code: String(/[\d\D]/s),
			output: String(/./s),
			options: [{ mode: "dot-if-dotAll", charClass: "[^]" }],
			errors
		},

		{
			code: String(/[\d\D]/),
			output: String(/./s),
			options: [{ mode: "dot", charClass: "[^]" }],
			errors
		},
		{
			code: String(/[\d\D]/mu),
			output: String(/./msu),
			options: [{ mode: "dot", charClass: "[^]" }],
			errors
		},
		{
			code: String(/[\d\D]/s),
			output: String(/./s),
			options: [{ mode: "dot", charClass: "[^]" }],
			errors
		},
	]
});
