# `prefer-character-class`

Prefer character classes wherever possible instead of alternations.

Fixable: `yes` <br> Recommended configuration: `"warn"`

[Source file](https://github.com/RunDevelopment/eslint-plugin-clean-regex/blob/master/lib/rules/prefer-character-class.js) <br> [Test file](https://github.com/RunDevelopment/eslint-plugin-clean-regex/blob/master/tests/lib/rules/prefer-character-class.js)


## Description

Instead of single-character alternatives (e.g. `(?:a|b|c)`), you should always use character classes (e.g. `[abc]`).

The main reason for doing this is performance, as a character class don't require backtracking or choosing the correct alternative via backtracking.
They are usually heavily optimized (because it's relatively easy and fast) and as fast as you can get while alternatives on the other hand, usually aren't optimized at all because said optimization is non-trivial and would take to long for interpreting-based engines.

Because they don't require backtracking, they are also somewhat safer than alternatives.
While `^(?:\w|a)+b$` will takes _O(2^n)_ time to reject the any string of n many `a`, the regex `^[\wa]+b$` will reject in _O(n)_.


### Limitations

This rule will only suggest you to merge characters and character classes, if it is absolutely safe to do so.

Right now, it will only suggest to merge adjacent characters, character classes, and character sets.
It will not suggest to merge characters which are separated by an alternative which isn't a single character, character class or character set because the order of alternatives matters.
