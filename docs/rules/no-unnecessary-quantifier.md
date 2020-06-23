# `no-unnecessary-quantifier`

> Disallow unnecessary quantifiers.

Fixable: `yes` <br> Recommended configuration: `"warn"`

<!-- prettier-ignore -->
[Source file](https://github.com/RunDevelopment/eslint-plugin-clean-regex/blob/master/lib/rules/no-unnecessary-quantifier.js) <br> [Test file](https://github.com/RunDevelopment/eslint-plugin-clean-regex/blob/master/tests/lib/rules/no-unnecessary-quantifier.js)

## Description

Unnecessary quantifiers are quantifiers which can be removed without changing
the meaning of the pattern.

A trivial example is: `a{1}` <br> Obviously, the quantifier can be removed.

This is the only auto-fixable unnecessary quantifier. All other unnecessary
quantifiers hint at programmer oversight or fundamental problems with the
pattern.

A not-so-trivial example is: `(?:a+b*|c*)?` <br> It's not very obvious that the
`?` quantifier can be removed. Without this quantifier, that pattern can still
match the empty string by choosing 0 many `c` in the `c*` alternative.

Other examples include `(?:\b|(?=%))+` and `(?:|(?:)){5,9}`.
