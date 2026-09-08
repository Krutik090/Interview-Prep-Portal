// Wraps an async Express handler so rejected promises reach the centralized
// error handler instead of crashing the process / hanging the request.
export function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}
