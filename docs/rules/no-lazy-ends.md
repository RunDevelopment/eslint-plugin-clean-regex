# `no-lazy-ends`

> Disallow lazy quantifiers at the end of an expression.

Fixable: `no` <br> Recommended configuration: `"warn"`

<!-- prettier-ignore -->
[Source file](https://github.com/RunDevelopment/eslint-plugin-clean-regex/blob/master/lib/rules/no-lazy-ends.js) <br> [Test file](https://github.com/RunDevelopment/eslint-plugin-clean-regex/blob/master/tests/lib/rules/no-lazy-ends.js)

## Description

If a lazily quantified element is the last element matched by an expression
(e.g. the `a{2,3}?` in `b+a{2,3}?`), we know that the lazy quantifier will
always only match the element the minimum number of times. The maximum is
completely ignored because the expression can accept after the minimum was
reached.

If the minimum of the lazy quantifier is 0, we can even remove the quantifier
and the quantified element without changing the meaning of the pattern. E.g.
`a+b*?` and `a+` behave the same.

If the minimum is 1, we can remove the quantifier. E.g. `a+b+?` and `a+b` behave
the same.

If the minimum is greater than 1, we can replace the quantifier with a constant,
greedy quantifier. E.g. `a+b{2,4}?` and `a+b{2}` behave the same.

### Examples

Examples of **valid** code for this rule:

<!-- prettier-ignore -->
```js
/a+?b*/
/a??(?:ba+?|c)*/
/ba*?$/
```

Examples of **invalid** code for this rule:

<!-- prettier-ignore -->
```js
/a??/
/a+b+?/
/a(?:c|ab+?)?/
```
