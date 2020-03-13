# `no-trivially-nested-lookaround`

Disallow lookarounds which contain an assertion as their only element.

Fixable: `yes` <br> Recommended configuration: `"warn"`

[Source file](https://github.com/RunDevelopment/eslint-plugin-clean-regex/blob/master/lib/rules/no-trivially-nested-lookaround.js) <br> [Test file](https://github.com/RunDevelopment/eslint-plugin-clean-regex/blob/master/tests/lib/rules/no-trivially-nested-lookaround.js)


## Description

It's possible to nest lookarounds as deep as you want without changing the formal language of the regular expression.
The nesting does not add meaning only making the pattern longer.

E.g. `(?=\b)` == `\b` and `(?=(?!a))` == `(?!a)`
