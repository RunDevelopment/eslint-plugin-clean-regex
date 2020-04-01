# eslint-plugin-clean-regex

[![Actions Status](https://github.com/RunDevelopment/eslint-plugin-clean-regex/workflows/Node.js%20CI/badge.svg)](https://github.com/RunDevelopment/eslint-plugin-clean-regex/actions)

An ESLint plugin for writing better regular expressions.


## Getting started

You'll need to install [ESLint](http://eslint.org) and `eslint-plugin-clean-regex`:

```
$ npm i eslint eslint-plugin-clean-regex --save-dev
```

**Note:** If you installed ESLint globally (using the `-g` flag) then you must also install `eslint-plugin-clean-regex` globally.

Add `clean-regex` to the plugins section of your `.eslintrc` configuration file (you can omit the `eslint-plugin-` prefix) and configure the rules you want:

```json
{
    "plugins": [
        "clean-regex"
    ],
    "rules": {
        "clean-regex/rule-name": 2
    }
}
```

You can also use the _recommended_ config:

```json
{
    "plugins": [
        "clean-regex"
    ],
    "extends": [
        "plugin:clean-regex/recommended"
    ]
}
```

The setting of every rule in the _recommended_ config can be found in the table below.


## Highlights

Some highlights of the working and working together of rules in the _recommended_ config.

### Optimize character classes

Before:

```js
/[0-9]/i
/[^\s]/
/[a-fA-F0-9]/i
/[a-zA-Z0-9_-]/
/[a-z\d\w]/
/[\S\d]/
```

After:

```js
/\d/
/\S/
/[a-f\d]/i
/[\w-]/
/\w/
/\S/
```

### Simplify patterns

Before:

```js
/(?:\w|\d)+/
/(?:a|b|(?:c)|d|(?:ee)){0,}/
/a+(?=$)/mi
/[\s\S]#[\0-\uFFFF]/ysi
```

After:

```js
/\w+/
/(?:[abcd]|ee)*/
/a+$/im
/.#./sy
```

### Detect non-functional code

```js
/\1(a)/     // `\1` won't work
/(?:\b)?a/  // `(?:\b)?` can be removed
/(?=a?).*/  // `(?=a?)` always accepts and can be removed
```


## Supported Rules

| Rule | Fix | Rec | Description |
| :--- | :--: | :--: | :--- |
| [confusing-quantifier](https://github.com/RunDevelopment/eslint-plugin-clean-regex/blob/master/docs/rules/confusing-quantifier.md) |  | :warning: | Warn about confusing quantifiers. |
| [consistent-match-all-characters](https://github.com/RunDevelopment/eslint-plugin-clean-regex/blob/master/docs/rules/consistent-match-all-characters.md) | :wrench: | :warning: | Use a certain character class consistently whenever all characters have to be matched. |
| [no-constant-capturing-group](https://github.com/RunDevelopment/eslint-plugin-clean-regex/blob/master/docs/rules/no-constant-capturing-group.md) |  | :warning: | Disallow capturing groups which can match one word. |
| [no-early-backreference](https://github.com/RunDevelopment/eslint-plugin-clean-regex/blob/master/docs/rules/no-early-backreference.md) |  | :heavy_exclamation_mark: | Disallow backreferences which appear before the group they reference ends. |
| [no-empty-lookaround](https://github.com/RunDevelopment/eslint-plugin-clean-regex/blob/master/docs/rules/no-empty-lookaround.md) |  | :heavy_exclamation_mark: | Disallow lookarounds which can match the empty string. |
| [no-lone-square-bracket](https://github.com/RunDevelopment/eslint-plugin-clean-regex/blob/master/docs/rules/no-lone-square-bracket.md) | :wrench: | :warning: | Disallow lone unescaped square brackets. |
| [no-octal-escape](https://github.com/RunDevelopment/eslint-plugin-clean-regex/blob/master/docs/rules/no-octal-escape.md) |  | :heavy_exclamation_mark: | Disallow octal escapes outside of character classes. |
| [no-optional-assertion](https://github.com/RunDevelopment/eslint-plugin-clean-regex/blob/master/docs/rules/no-optional-assertion.md) |  | :heavy_exclamation_mark: | Disallow optional assertions. |
| [no-trivially-nested-lookaround](https://github.com/RunDevelopment/eslint-plugin-clean-regex/blob/master/docs/rules/no-trivially-nested-lookaround.md) | :wrench: | :warning: | Disallow lookarounds which contain an assertion as their only element. |
| [no-unnecessary-character-class](https://github.com/RunDevelopment/eslint-plugin-clean-regex/blob/master/docs/rules/no-unnecessary-character-class.md) | :wrench: | :warning: | Disallow unnecessary character classes. |
| [no-unnecessary-flag](https://github.com/RunDevelopment/eslint-plugin-clean-regex/blob/master/docs/rules/no-unnecessary-flag.md) | :wrench: | :warning: | Disallow unnecessary regex flags. |
| [no-unnecessary-group](https://github.com/RunDevelopment/eslint-plugin-clean-regex/blob/master/docs/rules/no-unnecessary-group.md) | :wrench: | :warning: | Disallow unnecessary non-capturing groups. |
| [no-unnecessary-quantifier](https://github.com/RunDevelopment/eslint-plugin-clean-regex/blob/master/docs/rules/no-unnecessary-quantifier.md) | :wrench: | :warning: | Disallow unnecessary quantifiers. |
| [no-zero-quantifier](https://github.com/RunDevelopment/eslint-plugin-clean-regex/blob/master/docs/rules/no-zero-quantifier.md) | :wrench: | :heavy_exclamation_mark: | Disallow quantifiers with a maximum of 0. |
| [optimal-concatenation-quantifier](https://github.com/RunDevelopment/eslint-plugin-clean-regex/blob/master/docs/rules/optimal-concatenation-quantifier.md) | :wrench: | :warning: | Use optimal quantifiers for concatenated quantified characters. |
| [optimal-lookaround-quantifier](https://github.com/RunDevelopment/eslint-plugin-clean-regex/blob/master/docs/rules/optimal-lookaround-quantifier.md) |  | :warning: | Disallows the alternatives of lookarounds that end with a non-constant quantifier. |
| [optimized-character-class](https://github.com/RunDevelopment/eslint-plugin-clean-regex/blob/master/docs/rules/optimized-character-class.md) | :wrench: | :warning: | Disallows unnecessary elements in character classes. |
| [prefer-character-class](https://github.com/RunDevelopment/eslint-plugin-clean-regex/blob/master/docs/rules/prefer-character-class.md) | :wrench: | :warning: | Prefer character classes wherever possible instead of alternations. |
| [prefer-predefined-character-set](https://github.com/RunDevelopment/eslint-plugin-clean-regex/blob/master/docs/rules/prefer-predefined-character-set.md) | :wrench: | :warning: | Prefer predefined character sets instead of their more verbose form. |
| [prefer-predefined-quantifiers](https://github.com/RunDevelopment/eslint-plugin-clean-regex/blob/master/docs/rules/prefer-predefined-quantifiers.md) | :wrench: | :warning: | Prefer predefined quantifiers (+*?) instead of their more verbose form. |
| [sort-flags](https://github.com/RunDevelopment/eslint-plugin-clean-regex/blob/master/docs/rules/sort-flags.md) | :wrench: | :warning: | Requires the flags of regular expressions to be sorted. |

#### Legend

__Fix:__ Whether the rule is fixable: :wrench: = yes, otherwise no. <br>
__Rec:__ The setting of the rule in the _recommended_ configuration: :heavy_exclamation_mark: = `error`, :warning: = `warn`, otherwise `off`.
