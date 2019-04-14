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

* Fill in provided rules here





