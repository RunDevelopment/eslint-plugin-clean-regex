# `no-potentially-empty-backreference`

> Disallow backreferences whose referenced group might not be matched.

Fixable: `no` <br> Recommended configuration: `"warn"`

<!-- prettier-ignore -->
[Source file](https://github.com/RunDevelopment/eslint-plugin-clean-regex/blob/master/lib/rules/no-potentially-empty-backreference.js) <br> [Test file](https://github.com/RunDevelopment/eslint-plugin-clean-regex/blob/master/tests/lib/rules/no-potentially-empty-backreference.js)

## Description

If the referenced group of a backreference is not matched because some other
path leads to the backreference, the backreference will be replaced with the
empty string. The same will happen if the captured text of the referenced group
was reset before reaching the backreference.

This will handle backreferences which will always be replaced with the empty
string for the above reason. Use `no-empty-backreference` for that.

### Examples

Examples of **valid** code for this rule:

<!-- prettier-ignore -->
```js
/(a+)b\1/
/(a+)b|\1/  // this will be done by no-empty-backreference
```

Examples of **invalid** code for this rule:

<!-- prettier-ignore -->
```js
/(a)?b\1/
/((a)|c)+b\1/
```
