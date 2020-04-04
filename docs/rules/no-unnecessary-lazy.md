# `no-unnecessary-lazy`

Disallow unnecessarily lazy quantifiers.

Fixable: `yes` <br> Recommended configuration: `"warn"`

[Source file](https://github.com/RunDevelopment/eslint-plugin-clean-regex/blob/master/lib/rules/no-unnecessary-lazy.js) <br> [Test file](https://github.com/RunDevelopment/eslint-plugin-clean-regex/blob/master/tests/lib/rules/no-unnecessary-lazy.js)


## Description

Being lazy doesn't change constant quantifiers.


### Examples

Examples of __valid__ code for this rule:

```js
/ab+?c/
/a\w??c/
```

Examples of __invalid__ code for this rule:

```js
/ab{3}?c/
/b{2,2}?/
```
