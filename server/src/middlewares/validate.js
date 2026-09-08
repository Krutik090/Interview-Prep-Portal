import { ApiError } from '../utils/ApiError.js';

// Validates and replaces req[part] with the parsed (and stripped-of-unknown-
// keys, via .strict() schemas) result, so downstream code only ever sees
// well-formed input.
export function validate(schema, part = 'body') {
  return (req, res, next) => {
    const result = schema.safeParse(req[part]);
    if (!result.success) {
      next(ApiError.badRequest('Validation failed', result.error.flatten()));
      return;
    }
    req[part] = result.data;
    next();
  };
}
