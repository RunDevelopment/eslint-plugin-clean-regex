import { testRule } from "../../test-util";

testRule(__filename, undefined, {
	valid: [
		String(/a+|b+/),
		String(/a?|a{2,}/),
		String(/a*|b*/),
	],
	invalid: [
		{
			code: String(/b+(?:\w+|[+-]?\d+)/),
			errors: [{ message: "This alternative is not disjoint with `\\w+`. The shared language is /\\d+/i." }]
		},
		{
			code: String(/FOO|foo(?:bar)?/i),
			errors: [{ message: "This alternative is a superset of `FOO`." }]
		},
		{
			code: String(/foo(?:bar)?|foo/),
			errors: [{ message: "This alternative is a subset of `foo(?:bar)?` and can be removed." }]
		},
		{
			code: String(/(?=[\t ]+[\S]{1,}|[\t ]+['"][\S]|[\t ]+$|$)/),
			errors: [{ message: "This alternative is a subset of `[\\t ]+[\\S]{1,}` and can be removed." }]
		},
		{
			code: String(/\w+(?:\s+(?:\S+|"[^"]*"))*/),
			errors: [{ message: "This alternative is not disjoint with `\\S+`. The shared language is /\"[^\\s\"]*\"/i. This alternative is likely to cause exponential backtracking." }]
		},
		{
			code: String(/\b(?:\d|foo|\w+)\b/),
			errors: [{ message: "This alternative is a superset of `\\d` | `foo`." }]
		},
		{
			code: String(/\d|[a-z]|_|\w/i),
			errors: [{ message: "This alternative is the same as `\\d` | `[a-z]` | `_` and can be removed." }]
		},
	]
});
