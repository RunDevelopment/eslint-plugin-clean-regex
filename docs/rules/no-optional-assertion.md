# `no-optional-assertion`

> Disallow optional assertions.

configuration in `plugin:clean-regex/recommended`: `"error"`

<!-- prettier-ignore -->
[Source file](https://github.com/RunDevelopment/eslint-plugin-clean-regex/blob/master/lib/rules/no-optional-assertion.ts) <br> [Test file](https://github.com/RunDevelopment/eslint-plugin-clean-regex/blob/master/tests/lib/rules/no-optional-assertion.ts)

## Description

Assertions that as quantified in some way can be considered optional, if the
quantifier as a minimum of zero.

A simple example is the following pattern: `/a(?:$)*b/`. The end-of-string
assertion will obviously reject but if that happens, it will simply be ignored
because of the quantifier. The assertion is essentially optional, serving no
function whatsoever.

More generally, an assertion is optional, if the concatenation of all possible
paths that start at the start of a zero-quantified element, end at the end of
that element, and contain the assertion does not consume characters.

Here's an example of that: `a(?:foo|(?<!-)(?:-|\b))*b`. The `\b` is optional.
The lookbehind is not optional because following group can consume a character.

The presence of optional assertions don't change the meaning of the pattern, so
they are dead code.

### Examples

Examples of **valid** code for this rule:

<!-- prettier-ignore -->
```js
/\w+(?::|\b)/
```

Examples of **invalid** code for this rule:

<!-- prettier-ignore -->
```js
/(?:^)?\w+/   // warns about `^`
/\w+(?::|$)?/ // warns about `$`
```
