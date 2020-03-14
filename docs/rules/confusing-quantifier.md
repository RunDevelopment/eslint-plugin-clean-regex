# `confusing-quantifier`

Warn about confusing quantifiers.

Fixable: `no` <br> Recommended configuration: `"warn"`

[Source file](https://github.com/RunDevelopment/eslint-plugin-clean-regex/blob/master/lib/rules/confusing-quantifier.js) <br> [Test file](https://github.com/RunDevelopment/eslint-plugin-clean-regex/blob/master/tests/lib/rules/confusing-quantifier.js)


## Description

Confusing quantifiers are ones which imply one thing but don't deliver on that.

An example of this is `(?:a?b*|c+){4}` <br>
The group is quantified with `{4}` which implies that at least 4 characters will be matched but this is not the case as it will match the empty string.
It does that because in `a?b*`, it's possible to choose 0 many `a` and `b`.
So rather than `{4}`, `{0,4}` should be used to reflect the fact that the empty string can be matched.
