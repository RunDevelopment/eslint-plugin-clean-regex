# `no-octal-escape`

Disallow octal escapes outside of character classes.

Fixable: `no` <br> Recommended configuration: `"error"`

[Source file](https://github.com/RunDevelopment/eslint-plugin-clean-regex/blob/master/lib/rules/no-octal-escape.js) <br> [Test file](https://github.com/RunDevelopment/eslint-plugin-clean-regex/blob/master/tests/lib/rules/no-octal-escape.js)


## Description

Octal escapes can easily be confused with backreferences because the same character sequence (e.g. `\3`) can either escape characters or refer to a group depending on the number of capturing groups in the pattern.
This can be a problem during refactoring regular expressions as an octal escape can become a backreference or wise versa without changing the escape or backreference itself.

To prevent this issue, this rule disallows all octal escapes outside of character classes.

Inside a character class, an octal escape can never become a backreference, so they are allowed in there.
