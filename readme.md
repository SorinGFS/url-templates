---

title: URL Templates

description: A URL Template validator, expander and inspector

---

# URL Templates

`url-templates` validates, expands, compiles, and inspects URL Templates. It is fully RFC 6570 compliant and provides:

- validated and non-validated synchronous expansion paths;
- all RFC 6570 operators, prefix modifiers, and explode modifiers;
- scalar, array, and object expansion;
- an inspectable AST for linters and interfaces;
- callback-based value transformation;
- multi-pass and recursive expansion.

The package passes all 252 tests from the uritemplate-test suite plus 26 package-validation fixtures. It is a zero-dependency CommonJS package supporting Node.js 20 or newer.

RFC 6570 calls these constructs **URI Templates** because they can produce absolute or relative URI references. This package retains **URL Templates** in its public name and API description.

## Install

```bash title="console"
npm i url-templates
```

## API

### Validate a template

`isUrlTemplate(template)` returns `true` or throws an error at the first detected syntax violation.

<details>
<summary><strong>Examples and behavior</strong></summary>

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

</details>

### Inspect a template

`inspect(template)` performs the same validation and returns an AST containing literal segments, operators, variable names, prefix limits, and explode modifiers.

<details>
<summary><strong>Examples and behavior</strong></summary>

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
- Same as with `isUrlTemplate`, but if valid returns the parsed `AST` instead of `true`.

</details>

### Expand with validation

`parseTemplate(template)` validates the template and returns an object with an `expand(vars, callback)` method.

<details>
<summary><strong>Examples and behavior</strong></summary>

```js title="js"
const { parseTemplate } = require('url-templates');
try {
    console.log(parseTemplate('/items/{id}').expand({ id: 42 })); // '/items/42'
} catch (error) {
    console.error('parse/validation error:', error.message);
}
```

**Note:**
- If valid returns the `expand(vars)` function which returns the expanded `url-template`. Otherwise, it throws an `error`. The `expand` function also throws `error` if `limit` is defined on `objects` (`isUrlTemplate` function cannot know that without runtime vars).

</details>

### Expand without validation

`compile(template)` returns the same expander without first validating the template. Use it when validation occurs elsewhere or when unresolved or invalid parts must remain available for later processing.

<details>
<summary><strong>Examples and behavior</strong></summary>

```js title="js"
const { compile } = require('url-templates');
console.log(compile('/broken{').expand({})); // returns '/broken{'; invalid parts left for postprocessing
console.log(compile('/good{id}').expand({ id: 42 })); // returns '/good42';
console.log(compile('/undefined{id}').expand({ id: undefined })); // returns '/undefined{id}';
```

**Note:**
- Returns a usable expander without validation for cases where validation is done elsewhere, or for the cases where some sort of postprocessing will follow. A good example of postprocessing is described next:

</details>

### Expand in multiple passes without validation

Multi-pass expansion allows one set of variables to reveal templates for a later set of variables.

<details>
<summary><strong>Examples and behavior</strong></summary>

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
- The first pass will preserve the `{bar,baz}` expression only if the supplied variable has **none** of its members. This method can also be used to preserve quantifiers like `{1,4}` in regular expressions.

**Example 3 (transform with callback)**

```js title="js"
const { compile } = require('url-templates');
const vars1 = { foo: 1 };
const vars2 = { bar: 2, baz: 3 };
const firstPass = decodeURIComponent(compile('[{foo},{bar,baz}]').expand(vars1));
console.log(firstPass); // returns '[1,{bar,baz}]';
console.log(compile(firstPass).expand(vars2, (key) => key === 'baz' ? vars2[key] * 10 : vars2[key])); // returns '[1,2,30]';
```

**Note:**
- The optional `callback` function argument is present on each `expand` function.

</details>

### Recursively expand without validation

`recursiveCompile(vars, templateKey, callback)` repeatedly expands `vars[templateKey]` until the result stabilizes. If all required template members are present in one object, it performs the multi-pass process automatically.

<details>
<summary><strong>Examples and behavior</strong></summary>

**Example 1**

```js title="js"
const { recursiveCompile } = require('url-templates');
const vars = { start: '[{foo},{bar,baz}]', foo: 1, bar: 2, baz: 3 };
console.log(recursiveCompile(vars, 'start')); // returns '[1,2,3]';
```

**Example 2**

```js title="js"
const { recursiveCompile } = require('url-templates');
const vars = { start: '[{foo},{boo}]', boo: '{bar,baz}', foo: 1, bar: 2, baz: 3 };
console.log(recursiveCompile(vars, 'start')); // returns '[1,2,3]';
```

**Example 3 (transform with callback)**

```js title="js"
const { recursiveCompile } = require('url-templates');
const vars = { start: '[{foo},{bar,baz}]', foo: 1, bar: 2, baz: 3 };
console.log(recursiveCompile(vars, 'start', (key) => vars[key] * 2)); // returns '[2,4,6]';
```

</details>

## Processing model

The library separates syntax validation from expansion so callers can choose strict parsing or tolerant postprocessing:

1. `isUrlTemplate` checks the input type, literal characters, expression boundaries, operators, variable names, and modifiers.
2. `inspect` performs that validation while recording literals and parsed variable specifications in an AST.
3. `parseTemplate` validates once before creating an expander; `compile` creates the expander without validation.
4. Expansion obtains each value from `vars[key]`, or from `callback(key)` when a callback is supplied.
5. Undefined and `null` values are omitted during validated expansion. In non-validated expansion, a wholly unresolved expression is retained for later processing.
6. Strings, numbers, and booleans expand as scalar values. Arrays and objects follow RFC 6570 list, associative, prefix, and explode behavior.
7. Simple expansion percent-encodes reserved characters. Reserved (`+`) and fragment (`#`) expansion preserve characters that may carry URI structure.
8. `recursiveCompile` decodes each expansion result and repeats until two successive results are identical.

<details>
<summary><strong>Expansion model and modifiers</strong></summary>

| Operator | Output prefix | Separator | Named values | Reserved characters |
| --- | --- | --- | --- | --- |
| none | none | `,` | no | encoded |
| `+` | none | `,` | no | preserved |
| `#` | `#` | `,` | no | preserved |
| `.` | `.` | `.` | no | encoded |
| `/` | `/` | `/` | no | encoded |
| `?` | `?` | `&` | yes | encoded |
| `&` | `&` | `&` | yes | encoded |
| `;` | `;` | `;` | yes | encoded |

- `{var:3}` limits a scalar expansion to the first three Unicode characters.
- `{var*}` explodes a list or associative value into separate components.

Prefix modifiers intentionally accept positive JavaScript numeric forms that resolve to integers from 1 through 9999, including forms commonly emitted by YAML tooling. Prefix expansion counts Unicode code points rather than UTF-16 code units.

</details>

## Real-world use cases

### Construct API resource URLs

URI Templates describe related resources without manual concatenation or manual percent-encoding.

<details>
<summary><strong>Example and context</strong></summary>

```js
const { parseTemplate } = require('url-templates');

const repositoryUrl = parseTemplate('https://api.github.com/repos/{owner}/{repo}');
console.log(repositoryUrl.expand({ owner: 'example-owner', repo: 'url templates' }));
// https://api.github.com/repos/example-owner/url%20templates
```

The live [GitHub REST API root](https://api.github.com) publishes templates such as `https://api.github.com/repos/{owner}/{repo}` and `https://api.github.com/users/{user}/repos{?type,page,per_page,sort}` so clients can discover and expand URLs instead of reconstructing endpoint layouts.

</details>

### Add optional search, filter, and pagination parameters

Query expansion inserts `?` and `&` only when values are present. Exploded arrays generate repeated parameters.

<details>
<summary><strong>Example and context</strong></summary>

```js
const { parseTemplate } = require('url-templates');

const search = parseTemplate('/search{?q,tags*,page,per_page}');
console.log(search.expand({
    q: 'URI templates',
    tags: ['api', 'hypermedia'],
    page: 2,
    per_page: 20,
}));
// /search?q=URI%20templates&tags=api&tags=hypermedia&page=2&per_page=20
```

This pattern is used by GitHub API discovery, [JSON Hyper-Schema](https://json-schema.org/draft/2019-09/json-schema-hypermedia) pagination links, [HAL](https://stateless.co/hal_specification.html) templated search links, and [Spring HATEOAS](https://docs.spring.io/spring-hateoas/docs/current/reference/html/) request parameters.

</details>

### Follow templates returned by hypermedia APIs

An API response can provide a template whose final path or query values are known only by the client.

<details>
<summary><strong>Example and context</strong></summary>

GitHub repository representations, for example, expose content links ending in `{+path}`:

```js
const { parseTemplate } = require('url-templates');

const contentUrl = parseTemplate(
    'https://api.github.com/repos/{owner}/{repo}/contents/{+path}'
);
console.log(contentUrl.expand({
    owner: 'example-owner',
    repo: 'example-repository',
    path: 'docs/getting-started.md',
}));
// https://api.github.com/repos/example-owner/example-repository/contents/docs/getting-started.md
```

The same client-driven model appears in HAL templated links, [Hydra `IriTemplate`](https://www.hydra-cg.com/spec/latest/core/), JSON Hyper-Schema links, and Spring HATEOAS traversal.

</details>

### Build variable path hierarchies

Exploded path segments support file trees, category paths, nested resources, and object-storage keys while encoding each segment separately.

<details>
<summary><strong>Example and context</strong></summary>

```js
const { parseTemplate } = require('url-templates');

const files = parseTemplate('/files{/segments*}');
console.log(files.expand({ segments: ['images', 'hero banner.jpg'] }));
// /files/images/hero%20banner.jpg
```

RFC 6570 specifically identifies the `/` operator as useful for describing URI path hierarchies.

</details>

### Configure service and tenant endpoints

Deployment metadata and generated clients often vary hosts, ports, and base paths.

<details>
<summary><strong>Example and context</strong></summary>

```js
const { parseTemplate } = require('url-templates');

const server = parseTemplate('https://{tenant}.example.com:{port}/{basePath}');
console.log(server.expand({ tenant: 'demo', port: 8443, basePath: 'v2' }));
// https://demo.example.com:8443/v2
```

[OpenAPI server variables](https://spec.openapis.org/oas/v3.1.0.html) use a narrower named-substitution model for this purpose. OpenAPI paths and server URLs should therefore be treated as a compatible use case where their syntax overlaps RFC 6570, not as a guarantee that every OpenAPI serialization rule is a URI Template expression.

</details>

### Partition identifiers and content-addressed storage

Prefix modifiers can map large identifier spaces into hierarchical storage.

<details>
<summary><strong>Example and context</strong></summary>

```js
const { parseTemplate } = require('url-templates');

const objectPath = parseTemplate('/objects/{hash:2}/{hash}');
console.log(objectPath.expand({ hash: 'abcdef' }));
// /objects/ab/abcdef
```

RFC 6570 identifies reference indexes, hash-based storage, and maximum-length expansion as prefix-modifier use cases.

</details>

### Inspect templates for tooling and interfaces

Linters, documentation generators, request builders, and schema-backed forms can inspect structure before requesting values.

<details>
<summary><strong>Example and context</strong></summary>

```js
const { inspect } = require('url-templates');

console.dir(inspect('/search{?q,tags*}'), { depth: null });
// [ '/search', { '?': [ { key: 'q' }, { key: 'tags', explode: true } ] } ]
```

A template identifies variable names and expansion behavior but does not define value types, semantic meanings, or requiredness. Systems such as JSON Hyper-Schema and Hydra pair templates with external schema or mapping information for those responsibilities.

</details>

### Publish templated links in HTTP metadata

[RFC 9652](https://www.rfc-editor.org/rfc/rfc9652) defines the `Link-Template` HTTP field for publishing RFC 6570 templates alongside link relation metadata.

<details>
<summary><strong>Example and context</strong></summary>

```http
Link-Template: "/books/{book_id}/author"; rel="author"; anchor="#{book_id}"
```

A client can supply `book_id` to construct an author link for a book identified by the surrounding representation or protocol context.

</details>

## Intentional behavior and limitations

<details>
<summary><strong>Behavioral and security considerations</strong></summary>

- A URI Template is not itself a URI and must be expanded before being used as one.
- `compile` and `recursiveCompile` deliberately skip validation. Use `parseTemplate` when the template source is not already validated.
- Syntax validation does not establish that an expanded URI is trustworthy, reachable, authorized, or appropriate for a particular application.
- Reserved and fragment expansions can preserve URI-structural characters. Do not insert untrusted values into `{+var}` or `{#var}` without considering the resulting URI.
- URI Templates generate URI references; they are not a general reverse-routing grammar. RFC 6570 recommends regular expressions when variable extraction from existing URIs is required.
- Templates contain no variable type or schema declarations. Exploded arrays and objects depend on application context, schema, or API documentation.
- A prefix modifier is valid for scalar values, not arrays or objects. Validated expansion throws if a prefix modifier is applied to a composite value.
- Composite members used with reserved or fragment expansion should be strings.
- A callback replaces object lookup for every variable encountered during that expansion.
- Recursive expansion must converge. Cyclic or continually changing substitutions can prevent `recursiveCompile` from terminating.
- Relative results must be resolved against a base URI by the calling application when an absolute URI is required.

</details>

## Verification

Tests and benchmarks are maintained in [SorinGFS/public-data](https://github.com/SorinGFS/public-data) rather than in the package or canonical repository. The [gh-workspace-data](https://github.com/SorinGFS/gh-workspace-data) extension materializes both concerns together with the shared `#/version-layers.js` runtime required by their portable coordinators.

<details>
<summary><strong>gh-workspace-data usage</strong></summary>

Install the GitHub CLI extension once:

```bash title="console"
gh extension install SorinGFS/gh-workspace-data
```

Initialize and load workspace data from the cloned project repository:

```bash title="console"
gh workspace-data init
gh workspace-data load
```

The extension materializes ordinary local files under `#/public/tests/` and `#/public/benchmarks/`, while `#/version-layers.js` provides deterministic traversal support. The generated `#/` namespace remains excluded from the canonical Git repository and npm package.

Run `gh workspace-data load` again to refresh materialized data after public-data changes or an extension upgrade.

</details>

### Tests

The active suite contains 278 independently reported tests: all 252 cases from the external uritemplate-test suite plus 26 package-validation fixtures.

<details>
<summary><strong>Test details</strong></summary>

Run the materialized suite:

```bash title="console"
npm test
```

The suite uses the `node:test` module built into Node.js and requires no separate test-runner dependency. Its deterministic dispatcher delegates version-layer selection, numbered-fixture traversal, and explicit concern discovery to the `gh-workspace-data v0.5.0` runtime. `#/public/tests/index.json` selects the package's `isUrlTemplate` callback for validation fixtures, while the external expansion suite receives the package API from the root dispatcher.

The materialized `#/public/tests/README.md` documents fixture discovery, version eligibility, ordering, callback configuration, and suite registration. `npm test` exits unsuccessfully when configuration, fixture loading, suite registration, or a test fails.

Continuous integration runs all 278 tests on Node.js 20, 22, 24, and 26 across Ubuntu, Windows, and macOS.

</details>

### Benchmarks

The materialized benchmark suite measures isolated package loading and representative simple and complex inputs across all five package exports.

<details>
<summary><strong>Benchmark details</strong></summary>

Run the standard workload:

```bash title="console"
npm run benchmark
```

Run a reduced workload or emit machine-readable output directly:

```bash title="console"
node ./#/public/benchmarks --quick
node ./#/public/benchmarks --quick --json
```

The 11 results cover package loading; validation and AST inspection; validated and unvalidated expander construction; and direct and multi-pass recursive expansion. The portable coordinator delegates version-layer selection and ordered concern discovery to the `gh-workspace-data v0.5.0` runtime.

The harness records five initial calls, warmed minimum, median, 95th-percentile and maximum latency, and integer operations per second. Durations use milliseconds with six decimal places, and headings include the representative arguments. The default workload uses 100,000 iterations per sample. Custom iteration counts require direct invocation, for example `node ./#/public/benchmarks --iterations 250000`.

`parseTemplate` and `compile` scenarios measure construction of their returned expander objects. `recursiveCompile` scenarios measure complete direct and multi-pass expansion. The materialized benchmark README documents every scenario, workload control, output field, and interpretation constraint.

</details>

## Authoritative references

- [RFC 6570 — URI Template](https://www.rfc-editor.org/rfc/rfc6570)
- [RFC 3986 — Uniform Resource Identifier: Generic Syntax](https://www.rfc-editor.org/rfc/rfc3986)
- [RFC 9652 — The Link-Template HTTP Field](https://www.rfc-editor.org/rfc/rfc9652)
- [JSON Hyper-Schema](https://json-schema.org/draft/2019-09/json-schema-hypermedia)
- [Hydra Core Vocabulary](https://www.hydra-cg.com/spec/latest/core/)
- [OpenAPI Specification 3.1](https://spec.openapis.org/oas/v3.1.0.html)

## Disclaimer

The examples demonstrate template syntax and expansion behavior. Applications remain responsible for trusting template sources, validating variable values, resolving relative references, enforcing authorization, and deciding whether an expanded URI is safe to request or expose.
