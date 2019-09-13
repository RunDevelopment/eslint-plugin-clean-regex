# `no-empty-lookaround`

Disallow lookarounds which can match the empty string.

Fixable: `no` <br> Recommended configuration: `"error"`

[Source file](https://github.com/RunDevelopment/eslint-plugin-clean-regex/blob/master/lib/rules/no-empty-lookaround.js) <br> [Test file](https://github.com/RunDevelopment/eslint-plugin-clean-regex/blob/master/test/lib/rules/no-empty-lookaround.js)


## Description

### What are _empty lookarounds_?

An empty lookaround is a lookaround which for at least one path in the expression contains only elements which 1) are not assertions and can match the empty or 2) are empty lookarounds.

__Examples:__
- `(?=)`: One of simplest empty lookarounds.
- `(?=a*)`: Since `a*` match the empty string, the lookahead is _empty_.
- `(?=a|b*)`: Only one path has to match the empty string and `b*` does just that.
- `(?=a|$)`: Even though `$` does match the empty string, it is not and empty lookaround. Depending on whether the pattern is in multiline mode or not, `$` is equivalent to either `(?!.)` or `(?![\s\S])` with both being non-empty lookarounds. Similarly, all other standard assertions (`\b`, `\B`, `^`) are also not empty.

### Why are empty lookarounds a problem?

Because empty lookarounds accept the empty string, they are essentially non-functional. <br>
I.e. `(?=a*)b` will match `b` just fine; `(?=a*)` doesn't affect whether words are matched.
The same also happens for negated lookarounds where every path containing the negated lookaround will not be able to match any word. I.e. `(?!a*)b` won't match any words.

The only way to fix empty lookarounds is to either remove them or to rewrite the expression of the lookaround to be non-empty.