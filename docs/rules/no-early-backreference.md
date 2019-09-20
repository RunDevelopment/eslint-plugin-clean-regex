# `no-early-backreference`

Disallow backreferences which appear before the group they reference ends.

Fixable: `no` <br> Recommended configuration: `"error"`

[Source file](https://github.com/RunDevelopment/eslint-plugin-clean-regex/blob/master/lib/rules/no-early-backreference.js) <br> [Test file](https://github.com/RunDevelopment/eslint-plugin-clean-regex/blob/master/tests/lib/rules/no-early-backreference.js)


## Description

Backreferences which appear before the end of the capturing group they reference, will always be replaced with an empty string. E.g. `/^(a(?=\1))$/.test("a") === true`, `/^(?:\1(a)){2}$/.test("aa") === true`.

With this behavior the JavaScript regex engine is a bit of an outlier as virtually all other regex engines replace references to an unmatched capturing group with what behaves like `(?!)` and then they replace a reference consistently with the last captured test such that `^(?:\1?(a)){2}$` will match `aaa` in PCRE and python's `re`.
