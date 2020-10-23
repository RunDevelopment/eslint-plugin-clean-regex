import { testRule } from "../../test-util";

testRule(__filename, undefined, {
	valid: [
		String(/\b(?:aaa|\w|\d)\b/),
		String(/\b(?:,|:)\b/),
		String(/\b.\b/),
		String(/\B(?:aaa|\w|\d)\B/),
		String(/\B(?:,|:)\B/),
		String(/\B.\B/),

		String(/^foo$/),
		String(/\s^foo$\s/m),
		String(/.\s*^foo$\s*./m),

		String(/\w+(?=\s*;)/),
		String(/\w+(?=a)/),
		String(/\w+(?!a)/),
		String(/(?<=;\s*)\w+/),
		String(/(?<=a)\w+/),
		String(/(?<!a)\w+/),

		String(/(?=\w)\d?/),
		String(/(?!\d)\w+/),
		String(/(?=\d)\w+/),
		String(/(?=hello)\w+/),

		String(/(?=\w)[\d:]/),
		String(/(?!\w)[\d:]/),

		String(/(["'])(?:\\(?:\r\n|[\s\S])|(?!\1)[^\\\r\n])*\1/),
		String(/(\w)(?=\1)\w+/),
	],
	invalid: [
		{ code: String(/a\bb/), errors: [{ message: "`\\b` will always reject because it is preceded by a word character and followed by a word character." }] },
		{ code: String(/,\b,/), errors: [{ message: "`\\b` will always reject because it is preceded by a non-word character and followed by a non-word character." }] },
		{ code: String(/,\bb/), errors: [{ message: "`\\b` will always accept because it is preceded by a non-word character and followed by a word character." }] },
		{ code: String(/a\b,/), errors: [{ message: "`\\b` will always accept because it is preceded by a word character and followed by a non-word character." }] },

		{ code: String(/a\Bb/), errors: [{ message: "`\\B` will always accept because it is preceded by a word character and followed by a word character." }] },
		{ code: String(/,\B,/), errors: [{ message: "`\\B` will always accept because it is preceded by a non-word character and followed by a non-word character." }] },
		{ code: String(/,\Bb/), errors: [{ message: "`\\B` will always reject because it is preceded by a non-word character and followed by a word character." }] },
		{ code: String(/a\B,/), errors: [{ message: "`\\B` will always reject because it is preceded by a word character and followed by a non-word character." }] },

		{ code: String(/\w^foo/m), errors: [{ message: "`^` will always reject because it is preceded by a non-line-terminator character." }] },
		{ code: String(/\n^foo/m), errors: [{ message: "`^` will always accept because it is preceded by a line-terminator character." }] },
		{ code: String(/\w^foo/), errors: [{ message: "`^` will always reject because it is preceded by a character." }] },
		{ code: String(/\n^foo/), errors: [{ message: "`^` will always reject because it is preceded by a character." }] },

		{ code: String(/foo$\w/m), errors: [{ message: "`$` will always reject because it is followed by a non-line-terminator character." }] },
		{ code: String(/foo$\n/m), errors: [{ message: "`$` will always accept because it is followed by a line-terminator character." }] },
		{ code: String(/foo$\w/), errors: [{ message: "`$` will always reject because it is followed by a character." }] },
		{ code: String(/foo$\n/), errors: [{ message: "`$` will always reject because it is followed by a character." }] },

		{ code: String(/(?=\w)hello/), errors: [{ message: "The lookahead will always accept." }] },
		{ code: String(/(?=\w)\d/), errors: [{ message: "The lookahead will always accept." }] },
		{ code: String(/(?=\w)\w/), errors: [{ message: "The lookahead will always accept." }] },
		{ code: String(/(?=\w)(?:a+|b*c?|\d)d/), errors: [{ message: "The lookahead will always accept." }] },
		{ code: String(/(?!\w)hello/), errors: [{ message: "The lookahead will always reject." }] },
		{ code: String(/(?!\w)\d/), errors: [{ message: "The lookahead will always reject." }] },
		{ code: String(/(?!\w)\w/), errors: [{ message: "The lookahead will always reject." }] },
		{ code: String(/(?!\w)(?:a+|b*c?|\d)d/), errors: [{ message: "The lookahead will always reject." }] },

		{ code: String(/(?=\w),/), errors: [{ message: "The lookahead will always reject." }] },
		{ code: String(/(?=a)(,|b|c|(da)+)a/), errors: [{ message: "The lookahead will always reject." }] },
		{ code: String(/(?!\w),/), errors: [{ message: "The lookahead will always accept." }] },
		{ code: String(/(?!a)(,|b|c|(da)+)a/), errors: [{ message: "The lookahead will always accept." }] },

		{ code: String(/(\d)(?=\w)\1/), errors: [{ message: "The lookahead will always accept." }] },
		{ code: String(/(\d)(?!\w)\1/), errors: [{ message: "The lookahead will always reject." }] },

	]
});