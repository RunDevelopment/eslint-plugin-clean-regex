# `no-lone-closing-square-bracket`

Disallow lone unescaped closing square brackets.

Fixable: `no` <br> Recommended configuration: `"warn"`

[Source file](https://github.com/RunDevelopment/eslint-plugin-clean-regex/blob/master/lib/rules/no-lone-closing-square-bracket.js) <br> [Test file](https://github.com/RunDevelopment/eslint-plugin-clean-regex/blob/master/tests/lib/rules/no-lone-closing-square-bracket.js)


## Description

Lone closing square brackets can mislead people into interpreting the character literal as the closing bracket of a character class forcing them to re-read the expression. This is annoying at best and confusing at worst.

It is also a potential source of errors as the writers or regular expressions sometime forget to escape square brackets in characters classes.
