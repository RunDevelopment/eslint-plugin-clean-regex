# `no-zero-quantifier` :wrench:

> Disallow quantifiers with a maximum of 0.

configuration in `plugin:clean-regex/recommended`: `"error"`

<!-- prettier-ignore -->
[Source file](https://github.com/RunDevelopment/eslint-plugin-clean-regex/blob/master/lib/rules/no-zero-quantifier.js) <br> [Test file](https://github.com/RunDevelopment/eslint-plugin-clean-regex/blob/master/tests/lib/rules/no-zero-quantifier.js)

## Description

Quantifiers with a maximum of zero mean that the quantified element will never
be matched. They essentially produce dead code.

**Note:** The rule will not remove zero-quantified elements if they are or
contain a capturing group. In this case, the quantifier and element will simple
be reported.

### Examples

Examples of **valid** code for this rule:

<!-- prettier-ignore -->
```js
/a{0,1}/;
```

Examples of **invalid** code for this rule:

<!-- prettier-ignore -->
```js
/a{0}/;
/a{0,0}/;
```
