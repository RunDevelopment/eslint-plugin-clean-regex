# `prefer-character-class` :wrench:

> Prefer character classes wherever possible instead of alternations.

configuration in `plugin:clean-regex/recommended`: `"warn"`

<!-- prettier-ignore -->
[Source file](https://github.com/RunDevelopment/eslint-plugin-clean-regex/blob/master/lib/rules/prefer-character-class.js) <br> [Test file](https://github.com/RunDevelopment/eslint-plugin-clean-regex/blob/master/tests/lib/rules/prefer-character-class.js)

## Description

Instead of single-character alternatives (e.g. `(?:a|b|c)`), you should prefer
character classes (e.g. `[abc]`).

The main reason for doing this is performance. A character class doesn't require
backtracking (choosing the correct alternative) and are heavily optimized by the
regex engine. On the other hand, alternatives usually aren't optimized at all
because these optimizations are non-trivial and take too long to do them during
the execution of the program.

They are also safer than alternatives because they don't use backtracking. While
`^(?:\w|a)+b$` will take _O(2^n)_ time to reject a string of _n_ many `a`s, the
regex `^[\wa]+b$` will reject a string of _n_ many `a`s in _O(n)_.

### Limitation

The rule might not be able to merge alternatives that it knows cause exponential
backtracking. In this case, the rule will simply report the exponential
backtracking without a fix.

### Examples

Examples of **valid** code for this rule:

<!-- prettier-ignore -->
```js
/(?:a|bb)c/
/(?:a|a*)c/
```

Examples of **invalid** code for this rule:

<!-- prettier-ignore -->
```js
/a|b|c/       -> /[abc]/
/(?:a|b|c)c/    -> /[abc]c/
/(a|b|c)c/      -> /([abc])c/
```
