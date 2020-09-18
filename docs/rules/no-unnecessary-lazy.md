# `no-unnecessary-lazy` :wrench:

> Disallow unnecessarily lazy quantifiers.

configuration in `plugin:clean-regex/recommended`: `"warn"`

<!-- prettier-ignore -->
[Source file](https://github.com/RunDevelopment/eslint-plugin-clean-regex/blob/master/lib/rules/no-unnecessary-lazy.ts) <br> [Test file](https://github.com/RunDevelopment/eslint-plugin-clean-regex/blob/master/tests/lib/rules/no-unnecessary-lazy.ts)

## Description

This rule detects and provides fixers for two kinds of unnecessarily lazy
quantifiers.

First, it points out lazy constant quantifiers (e.g. `a{6}?`). It's obvious that
the lazy modifier doesn't affect the quantifier, so it can be removed.

Secondly, it detects lazy modifiers that can be removed based on the characters
of the quantified element and the possible characters after the quantifier.
Let's take `a+?b` as an example. The sequence of `a`s always has to be followed
by a `b`, so the regex engine can't be lazy and match as few `a`s as possible
because it doesn't have a choice. A lazy modifier only changes a pattern if the
regex engine has a choice as to whether it will do another iteration of the
quantified element or try to match the element after the quantifier.

### Examples

Examples of **valid** code for this rule:

<!-- prettier-ignore -->
```js
/a\w??c/
/a[\s\S]*?bar/
```

Examples of **invalid** code for this rule:

<!-- prettier-ignore -->
```js
/ab{3}?c/ -> /ab{3}c/
/b{2,2}?/ -> /b{2,2}/
/ab+?c/   -> /ab+c/
```
