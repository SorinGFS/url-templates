/**
 * Validate a template.
 * Returns true or throws a detailed error.
 *
 * @throws {TypeError | Error}
 */
declare function isUrlTemplate(template: string): boolean;

/**
 * Inspect a template.
 * Returns the parsed AST.
 */
declare function inspect(template: string): any[];

/**
 * Parse and validate a template.
 * Returns an object with an expand() method.
 *
 * @throws {TypeError | Error}
 */
declare function parseTemplate(template: string): { expand(vars?: any): string };

/**
 * Compile a template without validation.
 * Returns an object with an expand() method.
 */
declare function compile(template: string): { expand(vars?: any): string };

/**
 * Recursively compile a template without validation.
 * The start template must be a vars[key].
 * Returns the recursively compiled and expanded template.
 */
declare function recursiveCompile(vars: object, templateKey: string): string;

declare const urlTemplates: {
    isUrlTemplate: typeof isUrlTemplate;
    inspect: typeof inspect;
    parseTemplate: typeof parseTemplate;
    compile: typeof compile;
    recursiveCompile: typeof recursiveCompile;
};

export = urlTemplates;
