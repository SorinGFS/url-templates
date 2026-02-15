'use strict';
// RFC 6570 fully compiant uri-template validator and loader
const keyOperators = new Set(['?', '&', ';']);
const operators = new Set(['+', '#', '.', '/', '?', '&', ';']);
const separator = (operator) => (operator === '' || operator === '+' || operator == '#' ? ',' : operator === '?' ? '&' : operator);
const isDefined = (value) => value !== undefined && value !== null;
const encodeUnreserved = (string) => encodeURIComponent(string).replace(/[!'()*]/g, (char) => '%' + char.charCodeAt(0).toString(16).toUpperCase());
const encodeReserved = (string) =>
    string
        .split(/(%[0-9A-Fa-f]{2})/g)
        .map((part, i) => (i % 2 ? part : encodeURI(part).replace(/%5B/g, '[').replace(/%5D/g, ']')))
        .join('');
const encodeValue = (operator, value, key) => {
    value = operator === '+' || operator === '#' ? encodeReserved(value) : encodeUnreserved(value);
    return key ? encodeReserved(key) + '=' + value : value;
};
const ast = [];
// url-template validator
function isUrlTemplate(template, inspect) {
    if (typeof template !== 'string') throw new TypeError('uri-template must be a string.');
    if (!/^[A-Za-z0-9\-._~:/?#\[\]@!$&'()*+,;=%{}]*$/.test(template)) throw new SyntaxError('invalid character(s) in uri-template.');
    for (let i = 0; i < template.length; ) {
        const start = template.indexOf('{', i);
        const nextClose = template.indexOf('}', i);
        if (nextClose !== -1 && (start === -1 || nextClose < start)) throw new SyntaxError(`at index ${nextClose}: unstarted expression in uri-template.`);
        if (start === -1) {
            inspect && ast.push(template.slice(i));
            break;
        }
        if (inspect && start > i) ast.push(template.slice(i, start));
        const end = template.indexOf('}', start + 1);
        const nestedStart = template.indexOf('{', start + 1);
        if (end === -1 || (nestedStart !== -1 && nestedStart < end)) throw new SyntaxError(`at index ${start}: unterminated expression in uri-template.`);
        let expression = template.slice(start + 1, end);
        if (expression.length === 0) throw new SyntaxError(`at index ${start + 1}: empty expression.`);
        const first = expression[0];
        const operator = operators.has(first) ? ((expression = expression.slice(1)), first) : '';
        if (expression.length === 0) throw new SyntaxError(`at index ${start + 2}: expression missing variable names.`);
        const varspecs = expression.split(',').map((key) => {
            const colon = key.indexOf(':');
            const limit = colon !== -1 ? Number(key.slice(colon + 1)) : null;
            if (isDefined(limit) && (limit % 1 !== 0 || isNaN(limit) || limit < 1 || limit > 9999)) throw new SyntaxError(`at index ${start}: invalid limit modifier.`);
            if (limit) key = key.slice(0, colon);
            const explode = key.endsWith('*');
            if (explode) key = key.slice(0, -1);
            if (!/^(?:[A-Za-z0-9_]|%[0-9A-Fa-f]{2})+(?:\.(?:[A-Za-z0-9_]|%[0-9A-Fa-f]{2})+)*$/.test(key)) throw new SyntaxError(`at index ${operator ? start + 2 : start + 1}: invalid variable name in uri-template.`);
            return Object.assign({ key }, limit ? { limit } : explode ? { explode } : {});
        });
        if (inspect) ast.push({ [operator]: varspecs });
        i = end + 1;
    }
    return inspect ? ast : true;
}
// url-template filler with optional validation
function parseTemplate(template, validate) {
    if (validate) isUrlTemplate(template);
    return {
        expand: (vars = {}) =>
            template.replace(/([^\{\}]+)|\{([^\{\}])([^\{\}]*)\}/g, (match, literal, first, expression) => {
                if (first + expression) {
                    const values = [];
                    const operator = operators.has(first) ? first : ((expression = first + expression), '');
                    let defined = expression.split(/,/g).length;
                    expression.split(/,/g).forEach((variable) => {
                        const match = /(?<key>[^:\*]*)(?::(?<length>\d+)|(?<explode>\*))?/.exec(variable).groups;
                        const key = match.key;
                        const value = vars[key];
                        if (!isDefined(value)) defined--;
                        if (isDefined(value) && value !== '') {
                            if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
                                let string = value.toString();
                                if (match.length) string = string.substring(0, parseInt(match.length));
                                values.push(encodeValue(operator, string, keyOperators.has(operator) ? key : ''));
                            } else {
                                if (validate && match.length) throw new SyntaxError('invalid limit modifier on objects.');
                                if (match.explode) {
                                    if (Array.isArray(value)) {
                                        value.filter(isDefined).forEach((item) => values.push(encodeValue(operator, item, keyOperators.has(operator) ? key : '')));
                                    } else {
                                        Object.keys(value).forEach((key) => {
                                            if (isDefined(value[key])) values.push(encodeValue(operator, value[key], key));
                                        });
                                    }
                                } else {
                                    const array = [];
                                    if (Array.isArray(value)) {
                                        value.filter(isDefined).forEach((item) => array.push(encodeValue(operator, item)));
                                    } else {
                                        Object.keys(value).forEach((key) => {
                                            if (isDefined(value[key])) {
                                                array.push(encodeUnreserved(key));
                                                array.push(encodeValue(operator, value[key].toString()));
                                            }
                                        });
                                    }
                                    if (keyOperators.has(operator) && Object.keys(value).length) values.push(encodeUnreserved(key) + '=' + array.join());
                                    else if (array.length !== 0) values.push(array.join());
                                }
                            }
                        } else {
                            if (operator === ';') {
                                if (isDefined(value)) values.push(encodeUnreserved(key));
                            } else if (value === '' && (operator === '&' || operator === '?')) {
                                values.push(encodeUnreserved(key) + '=');
                            } else if (value === '') {
                                values.push('');
                            }
                        }
                    });
                    if (!defined && !validate) values.push(`{${expression}}`);
                    return (operator === '+' || values.length === 0 ? '' : operator) + values.join(separator(operator));
                }
                return encodeReserved(literal);
            }),
    };
}
// recursive compile
function recursiveCompile(vars, key) {
    let prev;
    let result = vars[key];
    do {
        prev = result;
        result = decodeURIComponent(parseTemplate(result).expand(vars));
    } while (result !== prev);
    return result;
}
// export
module.exports = {
    parseTemplate: (template) => parseTemplate(template, true),
    isUrlTemplate: (template) => isUrlTemplate(template),
    inspect: (template) => isUrlTemplate(template, true),
    compile: (template) => parseTemplate(template),
    recursiveCompile,
};
