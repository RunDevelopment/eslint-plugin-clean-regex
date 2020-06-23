# `optimal-concatenation-quantifier`

> Use optimal quantifiers for concatenated quantified characters.

Fixable: `yes` <br> Recommended configuration: `"warn"`

<!-- prettier-ignore -->
[Source file](https://github.com/RunDevelopment/eslint-plugin-clean-regex/blob/master/lib/rules/optimal-concatenation-quantifier.js) <br> [Test file](https://github.com/RunDevelopment/eslint-plugin-clean-regex/blob/master/tests/lib/rules/optimal-concatenation-quantifier.js)

## Description

If two quantified characters, character classes, or characters are concatenated,
the quantifiers can be optimized if either of the characters elements is a
subset of the other.

Let's take `\d+\w+` as an example. This can be optimized to the equivalent
pattern `\d\w+`. Not only is the optimized pattern simpler, it is also faster
because the first pattern might take up to _O(n^2)_ steps to fail while the
optimized pattern will fail after at most _O(n)_ steps. Generally, the optimized
pattern will take less backtracking steps to fail.

Choosing optimal quantifiers does not only make your patterns simpler but also
faster and most robust against ReDos attacks.

### `fixable: boolean`

With this option you can control whether reported issue will be auto-fixable.
You might want to turn the fixability off because the optimally-quantified
pattern does not express your intend.
