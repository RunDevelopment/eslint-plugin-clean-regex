# `no-lone-opening-square-bracket`

Disallow lone unescaped opening square brackets.

Fixable: `yes` <br> Recommended configuration: `"warn"`

[Source file](https://github.com/RunDevelopment/eslint-plugin-clean-regex/blob/master/lib/rules/no-lone-opening-square-bracket.js) <br> [Test file](https://github.com/RunDevelopment/eslint-plugin-clean-regex/blob/master/tests/lib/rules/no-lone-opening-square-bracket.js)


## Description

Lone opening square brackets inside of character classes can mislead reader into thinking that the character class starts at that opening bracket (e.g. `/[^[abc]/`).
This can be confusing and is therefore a potential cause of errors.
