/** Type declarations for URL template validation, inspection, and expansion. */

/**
 * Validate a template.
 * @returns true or throws a detailed error.
 *
 * @throws {TypeError | Error}
 */
declare function isUrlTemplate(template: string): boolean;

/**
 * Inspect a template.
 * @returns the parsed AST.
 */
declare function inspectUrlTemplate(template: string): any[];

/**
 * Expand the compiled template by given vars.
 * @param  vars - the object containing expansion variables.
 * @param  callback - optional function that receives the current key and should return a replacement for current value.
 * @returns the expanded template.
 */
declare function expand(vars?: any, callback?: (key: string) => any): string;

/**
 * Parse and validate a template.
 * @returns an object with an expand() method.
 *
 * @throws {TypeError | Error}
 */
declare function parseUrlTemplate(template: string): { expand: typeof expand };

/**
 * Compile a template without validation.
 * @returns an object with an expand() method.
 */
declare function compileUrlTemplate(template: string): { expand: typeof expand };

/**
 * Recursively compile a template without validation.
 * @param  vars - the object containing expansion variables.
 * @param  templateKey - starter template key, must be a vars[key].
 * @param  callback - optional function that receives the current key and should return a replacement for current value.
 * @returns the recursively compiled and expanded template.
 */
declare function recursiveCompileUrlTemplate(vars: object, templateKey: string, callback?: (key: string) => any): string;

declare const urlTemplates: {
    isUrlTemplate: typeof isUrlTemplate;
    inspectUrlTemplate: typeof inspectUrlTemplate;
    parseUrlTemplate: typeof parseUrlTemplate;
    compileUrlTemplate: typeof compileUrlTemplate;
    recursiveCompileUrlTemplate: typeof recursiveCompileUrlTemplate;
};

export = urlTemplates;
