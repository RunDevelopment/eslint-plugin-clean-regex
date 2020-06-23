# `no-obscure-range`

> Disallow obscure ranges in character classes.

Fixable: `no` <br> Recommended configuration: `"error"`

<!-- prettier-ignore -->
[Source file](https://github.com/RunDevelopment/eslint-plugin-clean-regex/blob/master/lib/rules/no-obscure-range.js) <br> [Test file](https://github.com/RunDevelopment/eslint-plugin-clean-regex/blob/master/tests/lib/rules/no-obscure-range.js)

## Description

The range operator (the `-` inside character classes) can easily be misused
(most unintentionally) to construct non-obvious character class. This rule will
disallow all but obvious uses of the range operator.

### Examples

Examples of **valid** code for this rule:

<!-- prettier-ignore -->
```js
/[a-z]/
/[J-O]/
/[1-9]/
/[\x00-\x40]/
/[\0-\uFFFF]/
/[\0-\u{10FFFF}]/u
/[\1-\5]/
/[\cA-\cZ]/
```

Examples of **invalid** code for this rule:

<!-- prettier-ignore -->
```js
/[A-\x43]/   // what's \x43? Bring me my ASCII table!
/[\41-\x45]/ // the minimum isn't hexadecimal
/[*/+-^&|]/  // because of +-^ it also matches all characters A-Z (among other)
```
