# `no-empty-backreference`

Disallow backreferences that will always be replaced with the empty string.

Fixable: `no` <br> Recommended configuration: `"error"`

[Source file](https://github.com/RunDevelopment/eslint-plugin-clean-regex/blob/master/lib/rules/no-empty-backreference.js) <br> [Test file](https://github.com/RunDevelopment/eslint-plugin-clean-regex/blob/master/tests/lib/rules/no-empty-backreference.js)


## Description

Backreferences that will always be replaced with the empty string serve no function and can be removed.


### Empty capturing groups

The easiest case of this is if the references capturing group does not consume any characters (e.g. `(\b)a\1`).
Since the capturing group can only capture the empty string, the backreference is essentially useless.

#### Examples

Examples of __valid__ code for this rule:

```js
/(a?)b\1/
/(\b|a)+b\1/
```

Examples of __invalid__ code for this rule:

```js
/(|)a\1/
/(\b)a\1/
/(^|(?=.))a\1/
```


### Unreachable backreferences

If a backreference cannot be reached from the position of the referenced capturing group without resetting the captured text, then backreference will always be replaced with the empty string.

If a group (capturing or non-capturing) is entered by the Javascript regex engine, the captured text of all capturing groups inside the group is reset.
So even though a backreference might be reachable for the position of its referenced capturing group, the text of that capturing might be reset.
An example of this is `(?:\1(a)){2}`.

Backreferences that appear before the referenced capturing group (e.g. `\1(a)`) will always be replaced with the empty string.

Please note that _before_ depends on the current matching direction.
RegExps are usually matched from left to right but inside lookbehind groups, text is matched from right to left.
I.e. the pattern `(?<=\1(a))b` will match all `b`s preceded by two `a`s.

#### Examples

Examples of __valid__ code for this rule:

```js
/(a)?(?:a|\1)/
```

Examples of __invalid__ code for this rule:

```js
/\1(a)/
/(a\1)/
/(a)|\1/
/(?:(a)|\1)+/ // the \1 can be reached but not without resetting the captured text
```
