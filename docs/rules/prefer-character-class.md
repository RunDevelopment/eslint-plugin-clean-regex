# `prefer-character-class`

> Prefer character classes wherever possible instead of alternations.

Fixable: `yes` <br> Recommended configuration: `"warn"`

<!-- prettier-ignore -->
[Source file](https://github.com/RunDevelopment/eslint-plugin-clean-regex/blob/master/lib/rules/prefer-character-class.js) <br> [Test file](https://github.com/RunDevelopment/eslint-plugin-clean-regex/blob/master/tests/lib/rules/prefer-character-class.js)

## Description

Instead of single-character alternatives (e.g. `(?:a|b|c)`), you should always
use character classes (e.g. `[abc]`).

The main reason for doing this is performance, as a character class doesn't
require backtracking or choosing the correct alternative via backtracking. They
are usually heavily optimized (because it's relatively easy and fast) and are as
fast as you can get. On the other hand, alternatives usually aren't optimized at
all because said optimization is non-trivial and takes too long for
interpreter-based engines.

Because they don't cause backtracking, they are also somewhat safer than
alternatives. While `^(?:\w|a)+b$` will takes _O(2^n)_ time to reject a string
of n many `a`, the regex `^[\wa]+b$` will reject in _O(n)_.

### Limitations

This rule will only suggest merging characters and character classes if it is
safe to do so.

Right now, it will only suggest merging adjacent characters, character classes,
and character sets. It will not suggest merging characters that are separated by
an alternative which isn't a single character, character class, or character set
because the order of alternatives matters.

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
/(?:a|b)c/    -> /[ab]c/
/(a|b)c/      -> /([ab])c/
/(?:[^\s]|b)/ -> /[\Sb]/
```
