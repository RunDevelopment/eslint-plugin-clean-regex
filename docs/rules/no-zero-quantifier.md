# `no-zero-quantifier`

Disallow quantifiers with a maximum of 0.

Fixable: `yes` <br> Recommended configuration: `"error"`

[Source file](https://github.com/RunDevelopment/eslint-plugin-clean-regex/blob/master/lib/rules/no-zero-quantifier.js) <br> [Test file](https://github.com/RunDevelopment/eslint-plugin-clean-regex/blob/master/tests/lib/rules/no-zero-quantifier.js)


## Description

Quantifiers with a maximum of zero mean that the quantified element will never be matched.
They essentially produce dead code.

__Note:__ The rule will not remove zero-quantified elements if they are or contain a capturing group.
In this case, the quantifier and element will simple be reported.
