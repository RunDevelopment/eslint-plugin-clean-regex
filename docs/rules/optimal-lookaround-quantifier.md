# `optimal-lookaround-quantifier`

Disallows the alternatives of lookarounds that end with a non-constant quantifier.

Fixable: `no` <br> Recommended configuration: `"warn"`

[Source file](https://github.com/RunDevelopment/eslint-plugin-clean-regex/blob/master/lib/rules/optimal-lookaround-quantifier.js) <br> [Test file](https://github.com/RunDevelopment/eslint-plugin-clean-regex/blob/master/tests/lib/rules/optimal-lookaround-quantifier.js)


## Description

Non-constant quantifiers are quantifiers that describe a range (e.g. `?`, `*`, `+`, `{0,1}`, `{5,9}`, `{3,}`).
They have to match some number of times (the minimum) after which further matches are optional until a certain maximum (may be infinite) is reached.

It's obvious that `/ba{2}/` and `/ba{2,6}/` will match differently because of the different quantifiers of `a` but that not the case if for lookarounds.
Both `/b(?=a{2})/` and `/b(?=a{2,6})/` will match strings the same way.
I.e. for the input string `"baaa"`, both will create the same match arrays.
The two regular expression are actually equivalent, meaning that `(?=a{2})` is equivalent to `(?=a{2,6})`.

More generally, if a non-constant quantifier is an __end__ of the expression tree of a __lookahead__, that quantifier can be replaced with a constant quantifier that matched the element minimum-if-the-non-constant-quantifier many times.
For __lookbehinds__, the non-constant quantifier has to be at the __start__ of the expression tree as lookbehinds are matched from right to left.

Examples:

```js
// lookaheads
/(?=ab+)/ == /(?=ab)/
/(?=ab*)/ == /(?=a)/
/(?!ab?)/ == /(?!a)/
/(?!ab{6,})/ == /(?!ab{6})/

// lookbehinds
/(?<=ab+)/ == /(?<=ab+)/
/(?<=a+b)/ == /(?<=ab)/
/(?<!\w*\s*,)/ == /(?<!,)/
```
