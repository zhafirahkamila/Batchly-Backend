import jwt from 'jsonwebtoken';
import { HttpError } from '../middleware/errorHandler.js';

function getSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET is not configured');
  return secret;
}

export function signToken(userId) {
  return jwt.sign({ sub: String(userId) }, getSecret(), {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, getSecret());
  } catch {
    throw new HttpError(401, 'Invalid or expired token');
  }
}
