# `no-empty-alternative`

> Disallow backreferences that will always be replaced with the empty string.

Fixable: `no` <br> Recommended configuration: `"warn"`

<!-- prettier-ignore -->
[Source file](https://github.com/RunDevelopment/eslint-plugin-clean-regex/blob/master/lib/rules/no-empty-alternative.js) <br> [Test file](https://github.com/RunDevelopment/eslint-plugin-clean-regex/blob/master/tests/lib/rules/no-empty-alternative.js)

## Description

While (re-)writing long regular expressions, it can happen that one forgets to
remove the `|` character of a former alternative. This rule tries to point out
these potential mistakes by reporting all empty alternatives.

### Examples

Examples of **valid** code for this rule:

<!-- prettier-ignore -->
```js
/(?:)/
/a+|b*/
```

Examples of **invalid** code for this rule:

<!-- prettier-ignore -->
```js
/a+|b+|/
/\|\||\|||\|\|\|/
/a(?:a|bc|def|h||ij|k)/
```
