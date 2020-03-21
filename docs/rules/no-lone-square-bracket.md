# `no-lone-square-bracket`

Disallow lone unescaped square brackets.

Fixable: `yes` <br> Recommended configuration: `"warn"`

[Source file](https://github.com/RunDevelopment/eslint-plugin-clean-regex/blob/master/lib/rules/no-lone-square-bracket.js) <br> [Test file](https://github.com/RunDevelopment/eslint-plugin-clean-regex/blob/master/tests/lib/rules/no-lone-square-bracket.js)


## Description

Lone square brackets can mislead people into interpreting these character literals as the boundaries of character classes.
As such, they are potential source of error and should always be escaped.
