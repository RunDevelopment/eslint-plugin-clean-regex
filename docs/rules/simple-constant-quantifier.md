# `simple-constant-quantifier`

Prefer simple constant quantifiers over the range form.

Fixable: `yes` <br> Recommended configuration: `"warn"`

[Source file](https://github.com/RunDevelopment/eslint-plugin-clean-regex/blob/master/lib/rules/simple-constant-quantifier.js) <br> [Test file](https://github.com/RunDevelopment/eslint-plugin-clean-regex/blob/master/tests/lib/rules/simple-constant-quantifier.js)


## Description

This rule enforces the usage from simple constant quantifiers (e.g. `a{2}`) instead of their more verbose range form (e.g. `a{2,2}`).

### Examples

Examples of __valid__ code for this rule:

```js
/a+b*c?/
/a{2,}b{2,6}c{2}/
```

Examples of __invalid__ code for this rule:

```js
/a{2,2}/
/a{100,100}?/
```