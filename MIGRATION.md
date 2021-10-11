# Migration guide

Since `eslint-plugin-clean-regex` has been deprecated, users are advised to migrate to [`eslint-plugin-regexp`] for continued support and improvements.

The following will outline how each rule configuration is to migrated to [`eslint-plugin-regexp`].


## One to one

Some rules were more or less copied one-to-one, so migrating these rules is as simple as changing `clean-regex/<rule X>` to `regexp/<rule Y>`. All of the following rules can migrated using this simple change:

- `clean-regex/confusing-quantifier` -> [`regexp/confusing-quantifier`](https://ota-meshi.github.io/eslint-plugin-regexp/rules/confusing-quantifier.html)
- `clean-regex/no-empty-alternative` -> [`regexp/no-empty-alternative`](https://ota-meshi.github.io/eslint-plugin-regexp/rules/no-empty-alternative.html)
- `clean-regex/no-empty-backreference` -> [`regexp/no-useless-backreference`](https://ota-meshi.github.io/eslint-plugin-regexp/rules/no-useless-backreference.html)
- `clean-regex/no-empty-lookaround` -> [`regexp/no-empty-lookarounds-assertion`](https://ota-meshi.github.io/eslint-plugin-regexp/rules/no-empty-lookarounds-assertion.html)
- `clean-regex/no-lazy-ends` -> [`regexp/no-lazy-ends`](https://ota-meshi.github.io/eslint-plugin-regexp/rules/no-lazy-ends.html)
- `clean-regex/no-obscure-range` -> [`regexp/no-obscure-range`](https://ota-meshi.github.io/eslint-plugin-regexp/rules/no-obscure-range.html)
- `clean-regex/no-octal-escape` -> [`regexp/no-octal`](https://ota-meshi.github.io/eslint-plugin-regexp/rules/no-octal.html)
- `clean-regex/no-optional-assertion` -> [`regexp/no-optional-assertion`](https://ota-meshi.github.io/eslint-plugin-regexp/rules/no-optional-assertion.html)
- `clean-regex/no-potentially-empty-backreference` -> [`regexp/no-potentially-useless-backreference`](https://ota-meshi.github.io/eslint-plugin-regexp/rules/no-potentially-useless-backreference.html)
- `clean-regex/no-trivially-nested-lookaround` -> [`regexp/no-trivially-nested-assertion`](https://ota-meshi.github.io/eslint-plugin-regexp/rules/no-trivially-nested-assertion.html)
- `clean-regex/no-trivially-nested-quantifier` -> [`regexp/no-trivially-nested-quantifier`](https://ota-meshi.github.io/eslint-plugin-regexp/rules/no-trivially-nested-quantifier.html)
- `clean-regex/no-unnecessary-assertions` -> [`regexp/no-useless-assertions`](https://ota-meshi.github.io/eslint-plugin-regexp/rules/no-useless-assertions.html)
- `clean-regex/no-unnecessary-character-class` -> [`regexp/no-useless-character-class`](https://ota-meshi.github.io/eslint-plugin-regexp/rules/no-useless-character-class.html)
- `clean-regex/no-unnecessary-flag` -> [`regexp/no-useless-flag`](https://ota-meshi.github.io/eslint-plugin-regexp/rules/no-useless-flag.html)
- `clean-regex/no-unnecessary-lazy` -> [`regexp/no-useless-lazy`](https://ota-meshi.github.io/eslint-plugin-regexp/rules/no-useless-lazy.html)
- `clean-regex/no-unnecessary-quantifier` -> [`regexp/no-useless-quantifier`](https://ota-meshi.github.io/eslint-plugin-regexp/rules/no-useless-quantifier.html)
- `clean-regex/no-zero-quantifier` -> [`regexp/no-zero-quantifier`](https://ota-meshi.github.io/eslint-plugin-regexp/rules/no-zero-quantifier.html)
- `clean-regex/optimal-concatenation-quantifier` -> [`regexp/optimal-quantifier-concatenation`](https://ota-meshi.github.io/eslint-plugin-regexp/rules/optimal-quantifier-concatenation.html)
- `clean-regex/optimal-lookaround-quantifier` -> [`regexp/optimal-lookaround-quantifier`](https://ota-meshi.github.io/eslint-plugin-regexp/rules/optimal-lookaround-quantifier.html)
- `clean-regex/prefer-character-class` -> [`regexp/prefer-character-class`](https://ota-meshi.github.io/eslint-plugin-regexp/rules/prefer-character-class.html)
- `clean-regex/prefer-predefined-assertion` -> [`regexp/prefer-predefined-assertion`](https://ota-meshi.github.io/eslint-plugin-regexp/rules/prefer-predefined-assertion.html)
- `clean-regex/simple-constant-quantifier` -> [`regexp/no-useless-two-nums-quantifier`](https://ota-meshi.github.io/eslint-plugin-regexp/rules/no-useless-two-nums-quantifier.html)
- `clean-regex/sort-flags` -> [`regexp/sort-flags`](https://ota-meshi.github.io/eslint-plugin-regexp/rules/sort-flags.html)

Note: The corresponding [`eslint-plugin-regexp`] rule is guaranteed to have all of the functionality of the `eslint-plugin-clean-regex` rule. However, the [`eslint-plugin-regexp`] rules might also report more.


## Other rules

### `clean-regex/consistent-match-all-characters`

Use [`regexp/match-any`](https://ota-meshi.github.io/eslint-plugin-regexp/rules/match-any.html) instead.

`regexp/match-any` has slightly different options:

- `mode: "dot"` -> `allows: ["dotAll"]`
- `mode: "char-class"` -> `allows: ["[^]"]` (use the string from the `charClass` option)
- `mode: "dot-if-dotAll"` -> `allows: ["[^]", "dotAll"]` (use the string from the `charClass` option) <br>
    (This isn't a perfect replacement but it's close.)

### `clean-regex/disjoint-alternatives`

Use [`regexp/no-dupe-disjunctions`](https://ota-meshi.github.io/eslint-plugin-regexp/rules/no-dupe-disjunctions.html) instead.

`regexp/no-dupe-disjunctions` can report a lot more than `clean-regex/disjoint-alternatives` but won't by default to filter out noise. Use `report: "all"` make it report everything that `clean-regex/disjoint-alternatives` reports.

### `clean-regex/identity-escape`

Use [`regexp/strict`](https://ota-meshi.github.io/eslint-plugin-regexp/rules/strict.html) instead.

`regexp/strict` does a lot more than just identity escapes and is less configurable. I recommend using `regexp/strict` because it implements a configuration for identity escapes that is compatible with Unicode regexes and future additions to JavaScript regexes.

### `clean-regex/no-constant-capturing-group`

Use [`regexp/no-empty-capturing-group`](https://ota-meshi.github.io/eslint-plugin-regexp/rules/no-empty-capturing-group.html) instead.

`regexp/no-empty-capturing-group` does exactly what `clean-regex/no-constant-capturing-group` does with `ignoreNonEmpty: true` (default). Reporting non-empty constant capturing groups isn't as useful, so it hasn't been added to [`eslint-plugin-regexp`].

### `clean-regex/no-unnecessary-group`

Use [`regexp/no-useless-non-capturing-group`](https://ota-meshi.github.io/eslint-plugin-regexp/rules/no-useless-non-capturing-group.html) instead.

Options are migrated as such:

- `allowTop: false` -> `allowTop: "never"`
- `allowTop: true` -> `allowTop: "always"`

### `clean-regex/optimized-character-class`

Use [`regexp/no-dupe-characters-character-class`](https://ota-meshi.github.io/eslint-plugin-regexp/rules/no-dupe-characters-character-class.html), [`regexp/no-useless-range`](https://ota-meshi.github.io/eslint-plugin-regexp/rules/no-useless-range.html), and [`regexp/prefer-range`](https://ota-meshi.github.io/eslint-plugin-regexp/rules/prefer-range.html) instead.

All three rules together perform the function of `clean-regex/optimized-character-class`.

### `clean-regex/prefer-predefined-character-set`

Use [`regexp/prefer-d`](https://ota-meshi.github.io/eslint-plugin-regexp/rules/prefer-d.html) and [`regexp/prefer-w`](https://ota-meshi.github.io/eslint-plugin-regexp/rules/prefer-w.html) instead.

The `allowDigitRange` translates to `regexp/prefer-d`'s `insideCharacterClass` option as follows:

- `allowDigitRange: false` -> `insideCharacterClass: "d"` (default)
- `allowDigitRange: true` (default) -> `insideCharacterClass: "ignore"`

### `clean-regex/prefer-predefined-quantifiers`

Use [`regexp/prefer-plus-quantifier`](https://ota-meshi.github.io/eslint-plugin-regexp/rules/prefer-plus-quantifier.html), [`regexp/prefer-question-quantifier`](https://ota-meshi.github.io/eslint-plugin-regexp/rules/prefer-question-quantifier.html), and [`regexp/prefer-star-quantifier`](https://ota-meshi.github.io/eslint-plugin-regexp/rules/prefer-star-quantifier.html) instead.

All three rules together perform the function of `clean-regex/prefer-predefined-quantifiers`.


## Recommended config

[`eslint-plugin-regexp`]'s recommended config is a lot stricter and includes a lot more rules than `eslint-plugin-clean-regex`'s recommended config. A configuration of [`eslint-plugin-regexp`]'s rules that is (almost) equivalent to `eslint-plugin-clean-regex`'s recommended config can be found here:

```json
{
    "plugins": [
        "regexp"
    ],
    "rules": {
        "regexp/confusing-quantifier": "warn",
        "regexp/disjoint-alternatives": ["warn", { "report": "all" }],
        "regexp/match-any": "warn",
        "regexp/no-dupe-characters-character-class": "warn",
        "regexp/no-empty-alternative": "warn",
        "regexp/no-empty-capturing-group": "warn",
        "regexp/no-empty-lookarounds-assertion": "error",
        "regexp/no-lazy-ends": "warn",
        "regexp/no-obscure-range": "error",
        "regexp/no-optional-assertion": "error",
        "regexp/no-potentially-useless-backreference": "warn",
        "regexp/no-trivially-nested-assertion": "warn",
        "regexp/no-trivially-nested-quantifier": "warn",
        "regexp/no-unnecessary-group": "warn",
        "regexp/no-useless-assertions": "error",
        "regexp/no-useless-backreference": "error",
        "regexp/no-useless-character-class": "warn",
        "regexp/no-useless-flag": "warn",
        "regexp/no-useless-lazy": "warn",
        "regexp/no-useless-quantifier": "warn",
        "regexp/no-useless-range": "warn",
        "regexp/no-useless-two-nums-quantifier": "warn",
        "regexp/no-zero-quantifier": "error",
        "regexp/optimal-lookaround-quantifier": "warn",
        "regexp/optimal-quantifier-concatenation": "warn",
        "regexp/prefer-character-class": "warn",
        "regexp/prefer-plus-quantifier": "warn",
        "regexp/prefer-predefined-assertion": "warn",
        "regexp/prefer-question-quantifier": "warn",
        "regexp/prefer-range": "warn",
        "regexp/prefer-star-quantifier": "warn",
        "regexp/regexp/prefer-d": "warn",
        "regexp/regexp/prefer-w": "warn",
        "regexp/sort-flags": "warn",
        "regexp/strict": "error"
    }
}
```


[`eslint-plugin-regexp`]: https://github.com/ota-meshi/eslint-plugin-regexp
