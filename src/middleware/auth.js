import { verifyToken } from '../utils/jwt.js';
import { HttpError } from './errorHandler.js';

export function requireAuth(req, _res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return next(new HttpError(401, 'Missing or invalid Authorization header'));
  }
  try {
    const payload = verifyToken(token);
    req.user = { id: Number(payload.sub) };
    next();
  } catch (err) {
    next(err);
  }
}
