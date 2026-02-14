---

title: URL Templates

description: A URL Template validator, expander and inspector

---

## Overview

A URL Template validator, expander and inspector — fully RFC 6570 compliant.
Passes all the 252 tests from the [uritemplate-test](https://github.com/uri-templates/uritemplate-test) suite. Minimal, zero dependency, sync API; exposes AST for linters/interfaces and both validated and non-validated expansion paths.

## Install

```bash title="console"
npm i url-templates
```

## Usage

This library provides the following `url-template` functions:

### Validation

```js title="js"
const { isUrlTemplate } = require('url-templates');
try {
    console.log('valid:', isUrlTemplate('/users/{id}')); // true
} catch (error) {
    console.error('invalid:', error.message);
}
```

**Note:**
It returns `true` or throws an `error`.

### Inspection

```js title="js"
const { inspect } = require('url-templates');
try {
    console.dir(inspect('/search{?q*,lang:2}'), { depth: null });
    // [ '/search', { '?': [ { key: 'q', explode: true }, { key: 'lang', limit: 2 } ] } ]
} catch (error) {
    console.error('invalid:', error.message);
}
```

**Note:**
Same as with `isUrlTemplate`, but if valid returns the parsed `AST` instead of `true`.

### Expansion with validation

```js title="js"
const { parseTemplate } = require('url-templates');
try {
    console.log(parseTemplate('/items/{id}').expand({ id: 42 })); // '/items/42'
} catch (error) {
    console.error('parse/validation error:', error.message);
}
```

**Note:**
If valid returns the `expand(vars)` function which returns the expanded `url-template`. Otherwise, it throws an `error`. The `expand` function also throws `error` if `limit` is defined on `objects` (`isUrlTemplate` function cannot know that without runtime vars).

### Expansion without validation

```js title="js"
const { compile } = require('url-templates');
console.log(compile('/broken{').expand({})); // returns '/broken{'; invalid parts left for postprocessing
console.log(compile('/good{id}').expand({ id: 42 })); // returns '/good42';
console.log(compile('/undefined{id}').expand({ id: undefined })); // returns '/undefined{id}';
```

**Note:**
Returns a usable expander without validation for cases where validation is done elsewhere, or for the cases where some sort of postprocessing will follow. A good example of postprocessing is described next:

### Multi pass expansion without validation

**Example 1**

```js title="js"
const { compile } = require('url-templates');
const vars1 = { anotherPattern: '{foo}', andAnotherPattern: '{bar,baz}' };
const vars2 = { foo: 1, bar: 2, baz: 3 };
const firstPass = decodeURIComponent(compile('[{anotherPattern},{andAnotherPattern}]').expand(vars1));
console.log(firstPass); // returns '[{foo},{bar,baz}]';
console.log(compile(firstPass).expand(vars2)); // returns '[1,2,3]';
```

**Example 2**

```js title="js"
const { compile } = require('url-templates');
const vars1 = { foo: 1 };
const vars2 = { bar: 2, baz: 3 };
const firstPass = decodeURIComponent(compile('[{foo},{bar,baz}]').expand(vars1));
console.log(firstPass); // returns '[1,{bar,baz}]';
console.log(compile(firstPass).expand(vars2)); // returns '[1,2,3]';
```

**Important Note:**
The first pass will preserve the `{bar,baz}` expression only if the supplied variable has **none** of its members. This method can also be used to preserve quantifiers like `{1,4}` in regular expresions.