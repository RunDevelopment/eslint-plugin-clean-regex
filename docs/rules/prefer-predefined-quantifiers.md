# `prefer-predefined-quantifiers`

Prefer predefined quantifiers (+*?) instead of their more verbose form.

Fixable: `yes` <br> Recommended configuration: `"error"`

[Source file](https://github.com/RunDevelopment/eslint-plugin-clean-regex/blob/master/lib/rules/prefer-predefined-quantifiers.js) <br> [Test file](https://github.com/RunDevelopment/eslint-plugin-clean-regex/blob/master/test/lib/rules/prefer-predefined-quantifiers.js)


## Description

Prefer predefined quantifiers over general quantifiers.
E.g. `?` instead of `{0,1}`, `*` instead of `{0,}`, and `+` instead of `{1,}`.