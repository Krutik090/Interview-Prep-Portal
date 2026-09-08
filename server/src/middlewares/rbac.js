import { ApiError } from '../utils/ApiError.js';

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      throw ApiError.forbidden('Insufficient permissions');
    }
    next();
  };
}

// Guards routes where the :param in the URL must match the authenticated
// user's own id — prevents a student from acting on another student's
// resource by guessing/enumerating an id, independent of role checks.
export function requireOwnership(paramName = 'userId') {
  return (req, res, next) => {
    if (req.user?.role === 'admin') {
      next();
      return;
    }
    if (req.user?.id !== req.params[paramName]) {
      throw ApiError.forbidden('You do not have access to this resource');
    }
    next();
  };
}
