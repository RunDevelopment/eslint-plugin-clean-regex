# `no-unnecessary-group`

Disallow unnecessary non-capturing groups.

Fixable: `yes` <br> Recommended configuration: `"warn"`

[Source file](https://github.com/RunDevelopment/eslint-plugin-clean-regex/blob/master/lib/rules/no-unnecessary-group.js) <br> [Test file](https://github.com/RunDevelopment/eslint-plugin-clean-regex/blob/master/tests/lib/rules/no-unnecessary-group.js)


## Description

Non-capturing groups which can be removed without changing the meaning of the pattern are unnecessary.
E.g. `a(?:bc)d` == `abcd` and `a(?:b)*c` == `ab*c`

Capturing groups will not be reported or removed.
