# `no-empty-backreference`

> Disallow backreferences that will always be replaced with the empty string.

configuration in `plugin:clean-regex/recommended`: `"error"`

<!-- prettier-ignore -->
[Source file](https://github.com/RunDevelopment/eslint-plugin-clean-regex/blob/master/lib/rules/no-empty-backreference.ts) <br> [Test file](https://github.com/RunDevelopment/eslint-plugin-clean-regex/blob/master/tests/lib/rules/no-empty-backreference.ts)

## Description

Backreferences that will always be replaced with the empty string serve no
function and can be removed.

### Empty capturing groups

The easiest case of this is if the references capturing group does not consume
any characters (e.g. `(\b)a\1`). Since the capturing group can only capture the
empty string, the backreference is essentially useless.

#### Examples

Examples of **valid** code for this rule:

<!-- prettier-ignore -->
```js
/(a?)b\1/
/(\b|a)+b\1/
```

Examples of **invalid** code for this rule:

<!-- prettier-ignore -->
```js
/(|)a\1/
/(\b)a\1/
/(^|(?=.))a\1/
```

### Unreachable backreferences

If a backreference cannot be reached from the position of the referenced
capturing group without resetting the captured text, then the backreference will
always be replaced with the empty string.

If a group (capturing or non-capturing) is entered by the Javascript regex
engine, the captured text of all capturing groups inside the group is reset. So
even though a backreference might be reachable for the position of its
referenced capturing group, the captured text might have been reset. An example
of this is `(?:\1(a)){2}`. The `\1` is reachable after `(a)` in the second
iteration but the captured text of `(a)` is reset by their parent non-capturing
group before `\1` can matched (in the second iteration). This means that the
Javascript regex `/^(?:\1(a)){2}$/` only accepts the string `aa` but not `aaa`.
(Note: The regex engines of other programming languages may behave differently.
I.e. with Python's re module, the regex `^(?:\1(a)){2}$` will accept the string
`aaa` but not `aa`.)

Backreferences that appear _before_ their referenced capturing group (e.g.
`\1(a)`) will always be replaced with the empty string.

Please note that _before_ depends on the current matching direction. RegExps are
usually matched from left to right but inside lookbehind groups, text is matched
from right to left. I.e. the pattern `(?<=\1(a))b` will match all `b`s preceded
by two `a`s.

#### Examples

Examples of **valid** code for this rule:

<!-- prettier-ignore -->
```js
/(a)?(?:a|\1)/
```

Examples of **invalid** code for this rule:

<!-- prettier-ignore -->
```js
/\1(a)/
/(a\1)/
/(a)|\1/
/(?:(a)|\1)+/ // the \1 can be reached but not without resetting the captured text
```
