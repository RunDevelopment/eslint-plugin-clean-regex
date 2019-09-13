# eslint-plugin-clean-regex

An ESLint plugin for clean regexes

## Installation

You'll first need to install [ESLint](http://eslint.org):

```
$ npm i eslint --save-dev
```

Next, install `eslint-plugin-clean-regex`:

```
$ npm install eslint-plugin-clean-regex --save-dev
```

**Note:** If you installed ESLint globally (using the `-g` flag) then you must also install `eslint-plugin-clean-regex` globally.

## Usage

Add `clean-regex` to the plugins section of your `.eslintrc` configuration file. You can omit the `eslint-plugin-` prefix:

```json
{
    "plugins": [
        "clean-regex"
    ]
}
```


Then configure the rules you want to use under the rules section.

```json
{
    "rules": {
        "clean-regex/rule-name": 2
    }
}
```

## Supported Rules

| Rule | Fix | Rec | Description |
| :--- | :--: | :--: | :--- |
| [no-constant-capturing-group](https://github.com/RunDevelopment/eslint-plugin-clean-regex/blob/master/docs/rules/no-constant-capturing-group.md) |  | :warning: | Disallow capturing groups which can match one word. |
| [no-early-backreference](https://github.com/RunDevelopment/eslint-plugin-clean-regex/blob/master/docs/rules/no-early-backreference.md) |  | :heavy_exclamation_mark: | Disallow backreferences which appear before the group they reference ends. |
| [no-empty-lookaround](https://github.com/RunDevelopment/eslint-plugin-clean-regex/blob/master/docs/rules/no-empty-lookaround.md) |  | :heavy_exclamation_mark: | Disallow lookarounds which can match the empty string. |
| [no-trivially-nested-lookaround](https://github.com/RunDevelopment/eslint-plugin-clean-regex/blob/master/docs/rules/no-trivially-nested-lookaround.md) | :wrench: | :heavy_exclamation_mark: | Disallow lookarounds which contain an assertion as their only element. |
| [no-unnecessary-character-class](https://github.com/RunDevelopment/eslint-plugin-clean-regex/blob/master/docs/rules/no-unnecessary-character-class.md) | :wrench: | :heavy_exclamation_mark: | Disallow unnecessary character classes. |
| [no-unnecessary-flag](https://github.com/RunDevelopment/eslint-plugin-clean-regex/blob/master/docs/rules/no-unnecessary-flag.md) | :wrench: | :heavy_exclamation_mark: | Disallow unnecessary regex flags. |
| [no-unnecessary-group](https://github.com/RunDevelopment/eslint-plugin-clean-regex/blob/master/docs/rules/no-unnecessary-group.md) | :wrench: | :heavy_exclamation_mark: | Disallow unnecessary non-capturing groups. |
| [no-unnecessary-quantifier](https://github.com/RunDevelopment/eslint-plugin-clean-regex/blob/master/docs/rules/no-unnecessary-quantifier.md) | :wrench: | :heavy_exclamation_mark: | Disallow unnecessary quantifiers. |
| [optimal-lookaround-quantifier](https://github.com/RunDevelopment/eslint-plugin-clean-regex/blob/master/docs/rules/optimal-lookaround-quantifier.md) |  | :heavy_exclamation_mark: | Disallows the alternates of lookarounds the end with a non-constant quantifier. |
| [optimized-character-class](https://github.com/RunDevelopment/eslint-plugin-clean-regex/blob/master/docs/rules/optimized-character-class.md) | :wrench: | :heavy_exclamation_mark: | Idk what to say here |
| [sort-flags](https://github.com/RunDevelopment/eslint-plugin-clean-regex/blob/master/docs/rules/sort-flags.md) | :wrench: | :heavy_exclamation_mark: | Requires the flags of regular expressions to be sorted. |

#### Legend

__Fix:__ Whether the rule is fixable: :wrench: = yes, otherwise no. <br>
__Rec:__ The setting of the rule in the _recommended_ configuration: :heavy_exclamation_mark: = `error`, :warning: = `warn`, otherwise `off`.
