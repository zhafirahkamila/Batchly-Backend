import { pool } from '../config/db.js';
import { HttpError } from '../middleware/errorHandler.js';
import { validateRegister, validateLogin } from '../middleware/validate.js';
import * as usersModel from '../models/users.model.js';
import { hashPassword, verifyPassword } from '../utils/password.js';
import { signToken } from '../utils/jwt.js';

function toPublicUser(row) {
  const { password_hash, ...rest } = row;
  return rest;
}

export async function register(req, res) {
  const { name, email, password, business_name } = validateRegister(req.body);

  const existing = await usersModel.findByEmail(pool, email);
  if (existing) throw new HttpError(409, 'email already registered');

  const password_hash = await hashPassword(password);
  const id = await usersModel.create(pool, { name, email, password_hash, business_name });
  const user = await usersModel.findById(pool, id);
  const token = signToken(id);

  res.status(201).json({ token, user });
}

export async function login(req, res) {
  const { email, password } = validateLogin(req.body);

  const row = await usersModel.findByEmail(pool, email);
  if (!row) throw new HttpError(401, 'invalid email or password');

  const ok = await verifyPassword(password, row.password_hash);
  if (!ok) throw new HttpError(401, 'invalid email or password');

  const token = signToken(row.id);
  res.json({ token, user: toPublicUser(row) });
}

export async function me(req, res) {
  const user = await usersModel.findById(pool, req.user.id);
  if (!user) throw new HttpError(404, 'user not found');
  res.json(user);
}
