import { testRule } from "../../test-util";

testRule(__filename, undefined, {
	valid: [
		String(/(?:a|b)/),
		String(/(?:a|b|c\b)/),
		String(/(?:[ab]|c\b)/),
		String(/(?:[ab]|c\b)/),
		String(/(?:[ab]|cd)/),
		String(/(?:[ab]|(c))/),
	],
	invalid: [
		{ code: String(/a|b|c/), output: String(/[abc]/), errors: 1 },
		{ code: String(/]|a|b/), output: String(/[\]ab]/), errors: 1 },
		{ code: String(/-|a|c/), output: String(/[-ac]/), errors: 1 },
		{ code: String(/a|-|c/), output: String(/[a\-c]/), errors: 1 },
		{ code: String(/a|[-]|c/), output: String(/[a\-c]/), errors: 1 },
		{ code: String(/(?:a|b|c)/), output: String(/[abc]/), errors: 1 },
		{ code: String(/(a|b|c)/), output: String(/([abc])/), errors: 1 },
		{ code: String(/(?<name>a|b|c)/), output: String(/(?<name>[abc])/), errors: 1 },
		{ code: String(/(?:a|b|c|d\b)/), output: String(/(?:[abc]|d\b)/), errors: 1 },
		{ code: String(/(?:a|b\b|[c]|d)/), output: String(/(?:[acd]|b\b)/), errors: 1 },
		{ code: String(/(?:a|\w|\s|["'])/), output: String(/[a\w\s"']/), errors: 1 },
		{ code: String(/(?:[^\s]|b)/), output: String(/[\Sb]/), errors: 1 },
		{ code: String(/(?:\w|-|\+|\*|\/)+/), output: String(/[\w\-\+\*\/]+/), errors: 1 },
		{ code: String(/(?=a|b|c)/), output: String(/(?=[abc])/), errors: 1 },
		{ code: String(/(?!a|b|c)/), output: String(/(?![abc])/), errors: 1 },
		{ code: String(/(?<=a|b|c)/), output: String(/(?<=[abc])/), errors: 1 },
		{ code: String(/(?<!a|b|c)/), output: String(/(?<![abc])/), errors: 1 },
		{ code: String(/(?=a|b|c|dd|e)/), output: String(/(?=[abce]|dd)/), errors: 1 },
		{ code: String(/(?!a|b|c|dd|e)/), output: String(/(?![abce]|dd)/), errors: 1 },
		{ code: String(/(?<=a|b|c|dd|e)/), output: String(/(?<=[abce]|dd)/), errors: 1 },
		{ code: String(/(?<!a|b|c|dd|e)/), output: String(/(?<![abce]|dd)/), errors: 1 },

		// always merge non-disjoint
		{ code: String(/(?:a|\w|b\b)/), output: String(/(?:[a\w]|b\b)/), errors: 1 },
		{ code: String(/(?:\w|a|b\b)/), output: String(/(?:[\wa]|b\b)/), errors: 1 },
		{ code: String(/(?:\w|b\b|a)/), output: String(/(?:[\wa]|b\b)/), errors: 1 },

		// and it will tell you about non-disjoint ones even if it can't fix them
		{ code: String(/(?:\w|b\b|b)/), output: String(/(?:\w|b\b|b)/), errors: 1 },

		// always do match all
		{ code: String(/(?:\s|\S|b\b)/), output: String(/(?:[\s\S]|b\b)/), errors: 1 },
		{ code: String(/(?:\w|\D|b\b)/), output: String(/(?:[\w\D]|b\b)/), errors: 1 },
		{ code: String(/(?:\w|\W|b\b)/), output: String(/(?:[\w\W]|b\b)/), errors: 1 },

		{
			code: String(/--?|-=|\+\+?|\+=|!=?|~|\*\*?|\*=|\/=?|%=?|<<=?|>>=?|<=?|>=?|==?|&&?|&=|\^=?|\|\|?|\|=|\?|:/),
			output: String(/--?|-=|\+\+?|\+=|!=?|[~\?:]|\*\*?|\*=|\/=?|%=?|<<=?|>>=?|<=?|>=?|==?|&&?|&=|\^=?|\|\|?|\|=/),
			errors: [{ message: "This can be replaced with `[~\\?:]|\\*\\*?|\\*=|\\/=?|%=?|<<=?|>>=?|<=?|>=?|==?|&&?|&=|\\^=?|\\|\\|?|\\|=`." }]
		},
		{
			code: String(/--?|\+\+?|!=?=?|<=?|>=?|==?=?|&&|\|\|?|\?|\*|\/|~|\^|%/),
			output: String(/--?|\+\+?|!=?=?|<=?|>=?|==?=?|&&|\|\|?|[\?\*\/~\^%]/),
			errors: [{ message: "This can be replaced with `[\\?\\*\\/~\\^%]`." }]
		},
	]
});
