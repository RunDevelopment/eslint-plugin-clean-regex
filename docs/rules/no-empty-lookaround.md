# `no-empty-lookaround`

> Disallow lookarounds that can match the empty string.

configuration in `plugin:clean-regex/recommended`: `"error"`

<!-- prettier-ignore -->
[Source file](https://github.com/RunDevelopment/eslint-plugin-clean-regex/blob/master/lib/rules/no-empty-lookaround.ts) <br> [Test file](https://github.com/RunDevelopment/eslint-plugin-clean-regex/blob/master/tests/lib/rules/no-empty-lookaround.ts)

## Description

### What are _empty lookarounds_?

An empty lookaround is a lookaround for which at least one path in the
lookaround expression contains only elements which 1) are not assertions and can
match the empty string or 2) are empty lookarounds. This means that the
lookaround expression will accept on any position in any string.

**Examples:**

-   `(?=)`: One of simplest empty lookarounds.
-   `(?=a*)`: Since `a*` match the empty string, the lookahead is _empty_.
-   `(?=a|b*)`: Only one path has to match the empty string and `b*` does just
    that.
-   `(?=a|$)`: Even though `$` does match the empty string, it is not and empty
    lookaround. Depending on whether the pattern is in multiline mode or not,
    `$` is equivalent to either `(?!.)` or `(?![\s\S])` with both being
    non-empty lookarounds. Similarly, all other standard assertions (`\b`, `\B`,
    `^`) are also not empty.

### Why are empty lookarounds a problem?

Because empty lookarounds accept the empty string, they are essentially
non-functional. <br> I.e. `(?=a*)b` will match `b` just fine; `(?=a*)` doesn't
affect whether words are matched. The same also happens for negated lookarounds
where every path containing the negated lookaround will not be able to match any
word. I.e. `(?!a*)b` won't match any words.

The only way to fix empty lookarounds is to either remove them or to rewrite the
lookaround expression to be non-empty.
