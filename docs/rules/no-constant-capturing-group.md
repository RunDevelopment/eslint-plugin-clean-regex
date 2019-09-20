# `no-constant-capturing-group`

Disallow capturing groups which can match one word.

Fixable: `no` <br> Recommended configuration: `"warn"`

[Source file](https://github.com/RunDevelopment/eslint-plugin-clean-regex/blob/master/lib/rules/no-constant-capturing-group.js) <br> [Test file](https://github.com/RunDevelopment/eslint-plugin-clean-regex/blob/master/tests/lib/rules/no-constant-capturing-group.js)


## Description

Constant capturing groups can only match one word.
Because they can only match one word, they should be replaced with the constant string they capture for better performance.
