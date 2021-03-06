# `confusing-quantifier`

> Warn about confusing quantifiers.

configuration in `plugin:clean-regex/recommended`: `"warn"`

<!-- prettier-ignore -->
[Source file](https://github.com/RunDevelopment/eslint-plugin-clean-regex/blob/master/lib/rules/confusing-quantifier.ts) <br> [Test file](https://github.com/RunDevelopment/eslint-plugin-clean-regex/blob/master/tests/lib/rules/confusing-quantifier.ts)

## Description

Confusing quantifiers are ones which imply one thing but don't deliver on that.

An example of this is `(?:a?b*|c+){4}`. The group is quantified with `{4}` which
implies that at least 4 characters will be matched but this is not the case. The
whole pattern will match the empty string. It does that because in the `a?b*`
alternative, it's possible to choose 0 many `a` and `b`. So rather than `{4}`,
`{0,4}` should be used to reflect the fact that the empty string can be matched.

### Examples

Examples of **valid** code for this rule:

<!-- prettier-ignore -->
```js
/a*/
/(a|b|c)+/
/a?/
```

Examples of **invalid** code for this rule:

<!-- prettier-ignore -->
```js
/(a?){4}/ // warns about `{4}`
/(a?b*)+/ // warns about `+`
```
